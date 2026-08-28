import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { PrismaClient, LogRecord } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { parseLogContent } from './lib/parser';
import { runDetectionEngine } from './lib/threatDetectionEngine';
import { ThreatAnalysisAgent } from './lib/ai/agent';
import { SummarizationAgent } from './lib/ai/summarizationAgent';
import { RiskAssessmentAgent } from './lib/ai/riskAssessmentAgent';
import { RecommendationAgent } from './lib/ai/recommendationAgent';
import { runAIInvestigation, getAIInvestigationStatus } from './services/aiInvestigationOrchestrator';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  optionalAuth,
  AuthenticatedRequest,
} from './lib/auth';
import { encryptApiKey, decryptApiKey, maskApiKey } from './lib/encryption';

dotenv.config();

// ─── Init ─────────────────────────────────────────────────────────────────

const app  = express();
const PORT = Number(process.env.PORT) || 5000;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Upload directory (persisted between restarts)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── Middleware ────────────────────────────────────────────────────────────

const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174'];
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
}));
app.use(express.json());
app.use(cookieParser());

// ─── Multer config ────────────────────────────────────────────────────────

const ALLOWED_MIMES = new Set([
  'text/csv',
  'text/plain',
  'application/json',
  'text/x-log',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/xml',
  'text/xml',
  'application/x-jsonlines',
]);

const ALLOWED_EXTS = new Set([
  '.csv',
  '.json',
  '.jsonl',
  '.ndjson',
  '.log',
  '.txt',
  '.xlsx',
  '.xls',
  '.xml',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.has(ext)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${ext}. Allowed: .csv .json .jsonl .xlsx .xml .log .txt`));
  },
});

// ─── Helper: Verify Threat Ownership ──────────────────────────────────────

async function verifyThreatOwnership(threatId: string, userId: string): Promise<boolean> {
  const threat = await prisma.threatEvent.findUnique({
    where: { id: threatId },
    include: {
      file: {
        include: {
          analysis: true,
        },
      },
    },
  });

  if (!threat) return false;

  // If the threat has an associated file and analysis, check ownership
  if (threat.file && threat.file.analysis) {
    return threat.file.analysis.userId === userId;
  }

  // Legacy unassigned threats: accessible by authenticated users during transition
  return true;
}

// ─── Public Health Check ───────────────────────────────────────────────────

app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: 'AegisAI REST Backend',
    version: '1.0.0',
    database: 'CONNECTED',
  });
});

// ──────────────────────────────────────────────────────────────────────────
// AUTHENTICATION ROUTES (Phase 3)
// ──────────────────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Full name is required.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to create user account.',
      details: err?.message,
    });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to log in.',
      details: err?.message,
    });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    res.json({
      success: true,
      user,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ──────────────────────────────────────────────────────────────────────────
// BYOK AI PROVIDER CONFIGURATION (Phase 5)
// ──────────────────────────────────────────────────────────────────────────

// GET /api/profile/ai-provider — Get masked AI Provider configuration
app.get('/api/profile/ai-provider', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const config = await prisma.aIProviderConfig.findUnique({
      where: { userId: req.user!.id },
    });

    if (!config || !config.encryptedApiKey) {
      res.json({
        success: true,
        provider: 'GEMINI',
        configured: false,
        maskedKey: null,
        enabled: false,
      });
      return;
    }

    let maskedKey = '••••••••';
    try {
      const decrypted = decryptApiKey(config.encryptedApiKey);
      maskedKey = maskApiKey(decrypted);
    } catch {
      maskedKey = '••••••••';
    }

    res.json({
      success: true,
      provider: config.provider,
      configured: true,
      maskedKey,
      enabled: config.enabled,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve AI provider configuration.',
    });
  }
});

// PUT /api/profile/ai-provider — Save or update user's BYOK API key (encrypted)
app.put('/api/profile/ai-provider', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { apiKey, provider = 'GEMINI' } = req.body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      res.status(400).json({ success: false, error: 'API key is required.' });
      return;
    }

    const cleanKey = apiKey.trim();
    if (cleanKey.length < 8) {
      res.status(400).json({ success: false, error: 'API key appears too short or invalid.' });
      return;
    }

    const encryptedApiKey = encryptApiKey(cleanKey);

    const updated = await prisma.aIProviderConfig.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        provider: String(provider).toUpperCase(),
        encryptedApiKey,
        enabled: true,
      },
      update: {
        provider: String(provider).toUpperCase(),
        encryptedApiKey,
        enabled: true,
      },
    });

    res.json({
      success: true,
      message: 'AI Provider key encrypted and saved successfully.',
      provider: updated.provider,
      configured: true,
      maskedKey: maskApiKey(cleanKey),
      enabled: updated.enabled,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to save AI provider configuration.',
      details: err?.message,
    });
  }
});

// DELETE /api/profile/ai-provider — Remove user's BYOK key
app.delete('/api/profile/ai-provider', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.aIProviderConfig.deleteMany({
      where: { userId: req.user!.id },
    });

    res.json({
      success: true,
      message: 'AI provider configuration removed successfully.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove AI provider configuration.',
    });
  }
});

// POST /api/profile/ai-provider/test — Verify Gemini connection safely
app.post('/api/profile/ai-provider/test', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let apiKeyToTest = req.body?.apiKey;

    if (!apiKeyToTest || typeof apiKeyToTest !== 'string' || apiKeyToTest.trim().length === 0) {
      const userConfig = await prisma.aIProviderConfig.findUnique({
        where: { userId: req.user!.id },
      });
      if (userConfig && userConfig.encryptedApiKey) {
        apiKeyToTest = decryptApiKey(userConfig.encryptedApiKey);
      }
    }

    if (!apiKeyToTest) {
      res.status(400).json({
        success: false,
        connected: false,
        error: 'No API key provided or configured to test.',
      });
      return;
    }

    const cleanKey = apiKeyToTest.trim();

    // Minimal lightweight safe API test: query models endpoint
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const testResp = await fetch(testUrl, { method: 'GET' });

    if (!testResp.ok) {
      const errBody = await testResp.text();
      if (testResp.status === 400 || testResp.status === 401 || errBody.includes('API_KEY_INVALID')) {
        res.status(400).json({
          success: false,
          connected: false,
          error: 'Gemini API key is invalid or unauthorized.',
        });
        return;
      } else if (testResp.status === 403) {
        res.status(403).json({
          success: false,
          connected: false,
          error: 'Gemini API access is not permitted for this key.',
        });
        return;
      } else if (testResp.status === 429) {
        res.status(429).json({
          success: false,
          connected: false,
          error: 'Gemini quota or rate limit reached.',
        });
        return;
      }
      res.status(400).json({
        success: false,
        connected: false,
        error: `Gemini verification failed (${testResp.status}): ${errBody.slice(0, 160)}`,
      });
      return;
    }

    const data = await testResp.json();
    const availableModels = data.models ? data.models.map((m: any) => m.name.replace('models/', '')) : [];
    const modelToReport = availableModels.find((m: string) => m.includes('flash')) || 'gemini-flash-latest';

    res.json({
      success: true,
      connected: true,
      provider: 'GEMINI',
      model: modelToReport,
      message: 'Gemini API key verified successfully.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      connected: false,
      error: 'Unable to reach Gemini API. Please check your network connection.',
      details: err?.message,
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// ANALYSIS MANAGEMENT ROUTES (Phase 3)
// ──────────────────────────────────────────────────────────────────────────

// POST /api/analyses — Create a new Analysis workspace
app.post('/api/analyses', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const analysisName = (name && typeof name === 'string' && name.trim().length > 0)
      ? name.trim()
      : `Investigation — ${new Date().toLocaleDateString()}`;

    const analysis = await prisma.analysis.create({
      data: {
        userId: req.user!.id,
        name: analysisName,
        description: description ? String(description).trim() : null,
        status: 'READY',
      },
    });

    res.status(201).json({
      success: true,
      data: analysis,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to create analysis.',
      details: err?.message,
    });
  }
});

// GET /api/analyses — List user's analyses with summary metrics
app.get('/api/analyses', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        logFiles: {
          include: {
            threatEvents: true,
          },
        },
      },
    });

    const formatted = analyses.map((a) => {
      const totalRecords = a.logFiles.reduce((sum, f) => sum + f.parsedRecords, 0);
      const totalThreats = a.logFiles.reduce((sum, f) => sum + f.threatEvents.length, 0);
      const hasHighThreat = a.logFiles.some(f => f.threatEvents.some(t => t.severity === 'HIGH' || t.severity === 'CRITICAL'));

      return {
        id: a.id,
        name: a.name,
        description: a.description,
        status: a.status,
        fileCount: a.logFiles.length,
        totalRecords,
        threatCount: totalThreats,
        severity: totalThreats > 0 ? (hasHighThreat ? 'HIGH' : 'MEDIUM') : null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        logFiles: a.logFiles.map((f) => ({
          id: f.id,
          analysisId: f.analysisId,
          originalName: f.originalName,
          fileName: f.fileName,
          fileSize: f.fileSize,
          logType: f.logType,
          totalLines: f.totalLines,
          parsedRecords: f.parsedRecords,
          errorCount: f.errorCount,
          status: f.status,
          uploadedAt: f.uploadedAt,
          threatCount: f.threatEvents.length,
        })),
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to load analyses.',
      details: err?.message,
    });
  }
});

// GET /api/analyses/:id — Inspect single analysis details
app.get('/api/analyses/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        logFiles: {
          include: {
            threatEvents: true,
          },
        },
      },
    });

    if (!analysis) {
      res.status(404).json({ success: false, error: 'Analysis not found.' });
      return;
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve analysis.' });
  }
});

// DELETE /api/analyses/:id
app.delete('/api/analyses/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        logFiles: true,
      },
    });

    if (!analysis) {
      res.status(404).json({ success: false, error: 'Analysis not found.' });
      return;
    }

    // Safely remove associated physical files from uploads directory
    if (analysis.logFiles && analysis.logFiles.length > 0) {
      for (const logFile of analysis.logFiles) {
        try {
          const filePath = path.join(UPLOAD_DIR, logFile.fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileErr) {
          console.warn(`[Delete] Could not remove physical file ${logFile.fileName}:`, fileErr);
        }
      }
    }

    await prisma.analysis.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Analysis and all associated data deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete analysis.', details: err?.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS (User-Scoped)
// ──────────────────────────────────────────────────────────────────────────

// GET /api/stats — Scoped to authenticated user
app.get('/api/stats', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user) {
      const userId = req.user.id;

      // Count user's analyses
      const totalAnalyses = await prisma.analysis.count({ where: { userId } });

      // Find user's analysis IDs
      const userAnalyses = await prisma.analysis.findMany({
        where: { userId },
        select: { id: true },
      });
      const analysisIds = userAnalyses.map(a => a.id);

      // User's log files
      const userFiles = await prisma.logFile.findMany({
        where: { analysisId: { in: analysisIds } },
        select: { id: true, parsedRecords: true },
      });
      const fileIds = userFiles.map(f => f.id);

      const totalFiles = userFiles.length;
      const totalRecords = userFiles.reduce((sum, f) => sum + f.parsedRecords, 0);

      // User's threats
      const [totalThreats, highThreats, mediumThreats] = await Promise.all([
        prisma.threatEvent.count({ where: { fileId: { in: fileIds } } }),
        prisma.threatEvent.count({ where: { fileId: { in: fileIds }, severity: 'HIGH' } }),
        prisma.threatEvent.count({ where: { fileId: { in: fileIds }, severity: 'MEDIUM' } }),
      ]);

      res.json({
        success: true,
        data: {
          totalAnalyses,
          totalFiles,
          totalRecords,
          totalThreats,
          highThreats,
          mediumThreats,
        },
      });
      return;
    }

    // Unauthenticated fallback: return baseline counts
    const [totalFiles, totalRecords, totalThreats, highThreats, mediumThreats] = await Promise.all([
      prisma.logFile.count(),
      prisma.logRecord.count(),
      prisma.threatEvent.count(),
      prisma.threatEvent.count({ where: { severity: 'HIGH' } }),
      prisma.threatEvent.count({ where: { severity: 'MEDIUM' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalAnalyses: 1,
        totalFiles,
        totalRecords,
        totalThreats,
        highThreats,
        mediumThreats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve stats.' });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// LOG FILE UPLOAD & INGESTION (User-Scoped)
// ──────────────────────────────────────────────────────────────────────────

// POST /api/logs/upload
app.post(
  '/api/logs/upload',
  optionalAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded.' });
      return;
    }

    try {
      let targetAnalysisId: string | null = req.body.analysisId ?? null;

      // If user is authenticated and no analysisId is provided, create a default Analysis workspace
      if (req.user) {
        if (targetAnalysisId) {
          const existing = await prisma.analysis.findFirst({
            where: { id: targetAnalysisId, userId: req.user.id },
          });
          if (!existing) {
            targetAnalysisId = null;
          }
        }

        if (!targetAnalysisId) {
          const newAnalysis = await prisma.analysis.create({
            data: {
              userId: req.user.id,
              name: `Investigation — ${file.originalname.replace(/\.[^/.]+$/, '')}`,
              status: 'READY',
            },
          });
          targetAnalysisId = newAnalysis.id;
        }
      }

      // Prevent duplicate ingestion within the same analysis workspace
      if (targetAnalysisId) {
        const existingFile = await prisma.logFile.findFirst({
          where: {
            analysisId: targetAnalysisId,
            originalName: file.originalname,
            fileSize: file.size,
          },
        });

        if (existingFile) {
          const tempPath = path.join(UPLOAD_DIR, file.filename);
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

          res.status(409).json({
            success: false,
            error: 'File already uploaded to this analysis.',
          });
          return;
        }
      }

      // Create a pending LogFile record
      const logFile = await prisma.logFile.create({
        data: {
          analysisId: targetAnalysisId,
          fileName:     file.filename,
          originalName: file.originalname,
          fileSize:     file.size,
          mimeType:     file.mimetype,
          logType:      'PROCESSING',
          status:       'PROCESSING',
        },
      });

      const filePath = path.join(UPLOAD_DIR, file.filename);

      let parseResult;
      try {
        const fileBuffer = fs.readFileSync(filePath);
        parseResult = await parseLogContent(fileBuffer, file.originalname);
      } catch (err: any) {
        await prisma.logFile.update({
          where: { id: logFile.id },
          data: { status: 'ERROR', logType: 'GENERIC', errorCount: 1 },
        });
        res.status(500).json({
          success: false,
          error: 'Failed to read or parse the uploaded file.',
          details: err?.message,
        });
        return;
      }

      // Chunk inserts for log records
      if (parseResult.records.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < parseResult.records.length; i += CHUNK) {
          const chunk = parseResult.records.slice(i, i + CHUNK);
          await prisma.logRecord.createMany({
            data: chunk.map((r) => ({
              fileId:    logFile.id,
              rowIndex:  r.rowIndex,
              raw:       r.raw,
              timestamp: r.timestamp  ?? null,
              level:     r.level      ?? null,
              source:    r.source     ?? null,
              message:   r.message    ?? null,
              extra:     r.extra      ?? null,
            })),
          });
        }
      }

      const updated = await prisma.logFile.update({
        where: { id: logFile.id },
        data: {
          logType:      parseResult.logType,
          totalLines:   parseResult.totalLines,
          parsedRecords: parseResult.parsedRecords,
          errorCount:   parseResult.errorCount,
          status:       'READY',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Log uploaded successfully',
        file: updated,
        data: updated,
        analysisId: targetAnalysisId,
        summary: {
          logType:      parseResult.logType,
          totalLines:   parseResult.totalLines,
          parsedRecords: parseResult.parsedRecords,
          errorCount:   parseResult.errorCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to process log upload.',
        details: err?.message,
      });
    }
  }
);

// ── GET /api/logs ──────────────────────────────────────────────────────────
app.get('/api/logs', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20))));

  const where: any = {};
  if (req.user) {
    where.analysis = { userId: req.user.id };
  }

  const [total, files] = await Promise.all([
    prisma.logFile.count({ where }),
    prisma.logFile.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, analysisId: true, originalName: true, fileSize: true, logType: true,
        totalLines: true, parsedRecords: true, errorCount: true,
        status: true, uploadedAt: true,
      },
    }),
  ]);

  res.json({
    success: true,
    data: files,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// ── GET /api/logs/:id ──────────────────────────────────────────────────────
app.get('/api/logs/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const file = await prisma.logFile.findUnique({
    where: { id: req.params.id },
    include: { analysis: true, threatEvents: true },
  });

  if (!file) {
    res.status(404).json({ success: false, error: 'Log file not found.' });
    return;
  }

  if (req.user && file.analysis && file.analysis.userId !== req.user.id) {
    res.status(404).json({ success: false, error: 'Log file not found.' });
    return;
  }

  res.json({ success: true, data: file });
});

// ── GET /api/logs/:id/records ──────────────────────────────────────────────
app.get('/api/logs/:id/records', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const page    = Math.max(1, parseInt(String(req.query.page   ?? 1)));
  const limit   = Math.min(500, Math.max(1, parseInt(String(req.query.limit  ?? 50))));
  const search  = String(req.query.search ?? '').trim();
  const level   = String(req.query.level  ?? '').trim().toUpperCase();
  const sortBy  = String(req.query.sortBy ?? 'rowIndex');
  const sortDir = String(req.query.sortDir ?? 'asc') === 'desc' ? 'desc' : 'asc';

  const file = await prisma.logFile.findUnique({
    where: { id },
    include: { analysis: true },
  });

  if (!file || (req.user && file.analysis && file.analysis.userId !== req.user.id)) {
    res.status(404).json({ success: false, error: 'Log file not found.' });
    return;
  }

  const validSort = new Set(['rowIndex', 'timestamp', 'level', 'source']);
  const orderField = validSort.has(sortBy) ? sortBy : 'rowIndex';

  const where: any = { fileId: id };
  if (level && level !== 'ALL') where.level = level;
  if (search) {
    where.OR = [
      { message: { contains: search, mode: 'insensitive' } },
      { raw:     { contains: search, mode: 'insensitive' } },
      { source:  { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.logRecord.count({ where }),
    prisma.logRecord.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    success: true,
    data: records,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// ── DELETE /api/logs/:id ───────────────────────────────────────────────────
app.delete('/api/logs/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = await prisma.logFile.findUnique({
      where: { id: req.params.id },
      include: { analysis: true },
    });

    if (!file || (file.analysis && file.analysis.userId !== req.user!.id)) {
      res.status(404).json({ success: false, error: 'Log file not found.' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, file.fileName);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (fileErr) {
      console.warn(`[Delete] Could not remove physical file ${file.fileName}:`, fileErr);
    }

    // If this log file is part of an analysis workspace, check if it's the sole file
    if (file.analysisId) {
      const siblingCount = await prisma.logFile.count({
        where: { analysisId: file.analysisId, NOT: { id: file.id } },
      });
      if (siblingCount === 0) {
        await prisma.analysis.delete({ where: { id: file.analysisId } });
        res.json({ success: true, message: 'Log file and associated analysis workspace deleted successfully.' });
        return;
      }
    }

    await prisma.logFile.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Log file deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete log file.', details: err?.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// THREAT DETECTION & INTELLIGENCE ROUTES (User-Scoped)
// ──────────────────────────────────────────────────────────────────────────

// ── GET /api/threats ───────────────────────────────────────────────────────
app.get('/api/threats', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const where: any = {};
  if (req.user) {
    where.file = { analysis: { userId: req.user.id } };
  }

  const threats = await prisma.threatEvent.findMany({
    where,
    orderBy: { detectedAt: 'desc' },
  });
  res.json({ success: true, data: threats });
});

// ── GET /api/threats/:id ───────────────────────────────────────────────────
app.get('/api/threats/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const threat = await prisma.threatEvent.findUnique({
    where: { id: req.params.id },
    include: { file: { include: { analysis: true } } },
  });

  if (!threat) {
    res.status(404).json({ success: false, error: 'Threat event not found.' });
    return;
  }

  if (req.user && threat.file?.analysis && threat.file.analysis.userId !== req.user.id) {
    res.status(404).json({ success: false, error: 'Threat event not found.' });
    return;
  }

  res.json({ success: true, data: threat });
});

// ── GET /api/logs/:id/threats ──────────────────────────────────────────────
app.get('/api/logs/:id/threats', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const file = await prisma.logFile.findUnique({
    where: { id: req.params.id },
    include: { analysis: true },
  });

  if (!file || (req.user && file.analysis && file.analysis.userId !== req.user.id)) {
    res.status(404).json({ success: false, error: 'Log file not found.' });
    return;
  }

  const threats = await prisma.threatEvent.findMany({
    where: { fileId: req.params.id },
    orderBy: { detectedAt: 'desc' },
  });
  res.json({ success: true, data: threats });
});

// ── POST /api/logs/:id/analyze ─────────────────────────────────────────────
app.post('/api/logs/:id/analyze', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const file = await prisma.logFile.findUnique({
    where: { id },
    include: { analysis: true },
  });

  if (!file || (req.user && file.analysis && file.analysis.userId !== req.user.id)) {
    res.status(404).json({ success: false, error: 'Log file not found.' });
    return;
  }

  const records = await prisma.logRecord.findMany({
    where: { fileId: id },
    orderBy: { rowIndex: 'asc' },
  });

  if (records.length === 0) {
    res.json({
      success: true,
      fileId: id,
      eventsAnalyzed: 0,
      threatsDetected: 0,
      threats: [],
    });
    return;
  }

  const detectedThreats = runDetectionEngine(records, id);

  const existingThreats = await prisma.threatEvent.findMany({
    where: { fileId: id },
  });

  const savedThreats = [];
  for (const threat of detectedThreats) {
    const isDuplicate = existingThreats.find((existing) => {
      const extEv = existing.evidence as any;
      const tEv = threat.evidence;
      const matchIP = extEv && tEv && extEv.sourceIp && tEv.sourceIp && extEv.sourceIp === tEv.sourceIp;
      const matchUser = extEv && tEv && extEv.username && tEv.username && extEv.username === tEv.username;
      return existing.title === threat.title &&
             existing.category === threat.category &&
             (matchIP || matchUser);
    });

    if (isDuplicate) {
      const mergedIds = Array.from(new Set([
        ...(isDuplicate.sourceRecordIds as string[]),
        ...threat.sourceRecordIds,
      ]));

      const updated = await prisma.threatEvent.update({
        where: { id: isDuplicate.id },
        data: {
          sourceRecordIds: mergedIds,
          evidence: {
            ...(isDuplicate.evidence as object),
            ...threat.evidence,
            failedAttempts: Math.max((isDuplicate.evidence as any).failedAttempts || 0, threat.evidence.failedAttempts || 0),
          },
        },
      });
      savedThreats.push(updated);
    } else {
      const created = await prisma.threatEvent.create({
        data: {
          fileId: threat.fileId,
          title: threat.title,
          category: threat.category,
          severity: threat.severity,
          riskScore: threat.riskScore,
          description: threat.description,
          evidence: threat.evidence,
          sourceRecordIds: threat.sourceRecordIds,
          status: threat.status,
        },
      });
      savedThreats.push(created);
    }
  }

  res.json({
    success: true,
    fileId: id,
    eventsAnalyzed: records.length,
    threatsDetected: savedThreats.length,
    threats: savedThreats,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// AI INVESTIGATION ROUTES (User-Scoped)
// ──────────────────────────────────────────────────────────────────────────

// GET /api/threats/:id/ai-investigation
app.get('/api/threats/:id/ai-investigation', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user) {
    const isOwner = await verifyThreatOwnership(id, req.user.id);
    if (!isOwner) {
      res.status(404).json({ success: false, error: 'Threat event not found.' });
      return;
    }
  }

  try {
    const statusResult = await getAIInvestigationStatus(id, prisma);
    res.json(statusResult);
  } catch (err: any) {
    res.status(err?.message?.includes('not found') ? 404 : 500).json({
      success: false,
      error: err?.message || 'Failed to retrieve AI investigation status.',
    });
  }
});

// POST /api/threats/:id/ai-investigation
app.post('/api/threats/:id/ai-investigation', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user) {
    const isOwner = await verifyThreatOwnership(id, req.user.id);
    if (!isOwner) {
      res.status(404).json({ success: false, error: 'Threat event not found.' });
      return;
    }
  }

  try {
    const investigationResult = await runAIInvestigation(id, prisma, req.user?.id);
    res.json(investigationResult);
  } catch (err: any) {
    const isConfigError = err?.message?.includes('provider') || err?.message?.includes('Key');
    const status = isConfigError ? 400 : 500;
    res.status(status).json({
      success: false,
      error: err?.message || 'An error occurred during AI investigation orchestration.',
    });
  }
});

// GET /api/threats/:id/analysis
app.get('/api/threats/:id/analysis', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user) {
    const isOwner = await verifyThreatOwnership(id, req.user.id);
    if (!isOwner) {
      res.status(404).json({ success: false, error: 'Threat event not found.' });
      return;
    }
  }

  try {
    const analysis = await prisma.threatAnalysis.findFirst({
      where: { threatEventId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) {
      res.status(404).json({ success: false, error: 'No analysis found for this threat event.' });
      return;
    }

    res.json({ success: true, threatId: id, analysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve threat analysis.' });
  }
});

// GET /api/threats/:id/summary
app.get('/api/threats/:id/summary', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user) {
    const isOwner = await verifyThreatOwnership(id, req.user.id);
    if (!isOwner) {
      res.status(404).json({ success: false, error: 'Threat event not found.' });
      return;
    }
  }

  try {
    const summary = await prisma.incidentSummary.findFirst({
      where: { threatEventId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!summary) {
      res.status(404).json({ success: false, error: 'No incident summary found for this threat event.' });
      return;
    }

    res.json({ success: true, threatId: id, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve incident summary.' });
  }
});

// GET /api/threats/:id/risk-assessment
app.get('/api/threats/:id/risk-assessment', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user) {
    const isOwner = await verifyThreatOwnership(id, req.user.id);
    if (!isOwner) {
      res.status(404).json({ success: false, error: 'Threat event not found.' });
      return;
    }
  }

  try {
    const riskAssessment = await prisma.riskAssessment.findFirst({
      where: { threatEventId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!riskAssessment) {
      res.status(404).json({ success: false, error: 'No risk assessment found for this threat event.' });
      return;
    }

    res.json({ success: true, threatId: id, riskAssessment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve risk assessment.' });
  }
});

// GET /api/threats/:id/recommendations
app.get('/api/threats/:id/recommendations', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user) {
    const isOwner = await verifyThreatOwnership(id, req.user.id);
    if (!isOwner) {
      res.status(404).json({ success: false, error: 'Threat event not found.' });
      return;
    }
  }

  try {
    const recommendation = await prisma.responseRecommendation.findFirst({
      where: { threatEventId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!recommendation) {
      res.status(404).json({ success: false, error: 'No response recommendations found for this threat event.' });
      return;
    }

    res.json({ success: true, threatId: id, recommendation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve response recommendations.' });
  }
});

// ─── Error Handling ───────────────────────────────────────────────────────

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 50MB.',
      });
    }
  }
  const status  = err.status ?? 400;
  const message = err.message ?? 'An error occurred.';
  res.status(status).json({ success: false, error: message });
});

// ─── Start ─────────────────────────────────────────────────────────────────

async function main() {
  await prisma.$connect();
  return app.listen(PORT, () => {
    console.log(`[AegisAI] Server running at http://localhost:${PORT}`);
    console.log(`[AegisAI] Upload directory: ${UPLOAD_DIR}`);
  });
}

export { app, prisma, main };

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  main().catch((err) => {
    console.error('[AegisAI] Fatal startup error:', err);
    process.exit(1);
  });
}
