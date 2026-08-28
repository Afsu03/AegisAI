/**
 * AegisAI API Client
 * Typed fetch wrapper for all backend endpoints with multi-user authentication support.
 * Single source of truth for BASE_URL — do not use fetch() directly elsewhere.
 */

import type {
  User,
  AuthResponse,
  AnalysisSummary,
  AnalysisDetail,
  UploadResult,
  PaginatedLogFiles,
  PaginatedLogRecords,
  HealthStatus,
  LogFile,
  ThreatEvent,
  DashboardStats,
  ThreatAnalysis,
  IncidentSummary,
  RiskAssessment,
  ResponseRecommendation,
  AIInvestigationResponse,
} from '../types';

export const BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ||
   (import.meta.env.VITE_API_URL as string | undefined) ||
   'http://localhost:5000').replace(/\/+$/, '');

const TOKEN_KEY = 'aegis_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// ─── Generic helpers ──────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errBody: { error?: string; details?: string } = {};
    try { errBody = await res.json(); } catch { /* empty */ }
    const msg = errBody.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/**
 * Wraps fetch() with Authorization header, credentials, and user-friendly connection errors.
 */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    return await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err: any) {
    const host = BASE_URL.replace(/^https?:\/\//, '');
    if (err?.name === 'TypeError') {
      throw new Error(
        `Backend unavailable. Cannot connect to AegisAI backend at ${host}. ` +
        `Start the server: cd backend && npm run dev`
      );
    }
    throw err;
  }
}

// ─── Health ───────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthStatus> {
  const res = await apiFetch(`${BASE_URL}/api/health`);
  return handleResponse<HealthStatus>(res);
}

// ─── Authentication (Phase 3) ─────────────────────────────────────────────

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  const data = await handleResponse<AuthResponse>(res);
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<AuthResponse>(res);
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<{ success: boolean; user: User }> {
  const res = await apiFetch(`${BASE_URL}/api/auth/me`);
  return handleResponse<{ success: boolean; user: User }>(res);
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  setAuthToken(null);
  const res = await apiFetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' });
  return handleResponse<{ success: boolean; message: string }>(res);
}

// ─── BYOK AI Provider (Phase 5) ───────────────────────────────────────────

export interface AIProviderStatus {
  success:    boolean;
  provider:   string;
  configured: boolean;
  maskedKey:  string | null;
  enabled:    boolean;
}

export async function getAIProviderConfig(): Promise<AIProviderStatus> {
  const res = await apiFetch(`${BASE_URL}/api/profile/ai-provider`);
  return handleResponse<AIProviderStatus>(res);
}

export async function saveAIProviderConfig(apiKey: string, provider = 'GEMINI'): Promise<{ success: boolean; message: string; provider: string; configured: boolean; maskedKey: string }> {
  const res = await apiFetch(`${BASE_URL}/api/profile/ai-provider`, {
    method: 'PUT',
    body: JSON.stringify({ apiKey, provider }),
  });
  return handleResponse<{ success: boolean; message: string; provider: string; configured: boolean; maskedKey: string }>(res);
}

export async function removeAIProviderConfig(): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${BASE_URL}/api/profile/ai-provider`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

export async function testAIProviderConnection(apiKey?: string): Promise<{ success: boolean; connected: boolean; provider: string; model?: string; message?: string }> {
  const res = await apiFetch(`${BASE_URL}/api/profile/ai-provider/test`, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
  return handleResponse<{ success: boolean; connected: boolean; provider: string; model?: string; message?: string }>(res);
}

// ─── Analyses (Phase 3) ───────────────────────────────────────────────────

export async function getAnalyses(): Promise<{ success: boolean; data: AnalysisSummary[] }> {
  const res = await apiFetch(`${BASE_URL}/api/analyses`);
  return handleResponse<{ success: boolean; data: AnalysisSummary[] }>(res);
}

export async function getAnalysis(id: string): Promise<{ success: boolean; data: AnalysisDetail }> {
  const res = await apiFetch(`${BASE_URL}/api/analyses/${id}`);
  return handleResponse<{ success: boolean; data: AnalysisDetail }>(res);
}

export async function createAnalysis(name: string, description?: string): Promise<{ success: boolean; data: AnalysisDetail }> {
  const res = await apiFetch(`${BASE_URL}/api/analyses`, {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
  return handleResponse<{ success: boolean; data: AnalysisDetail }>(res);
}

export async function deleteAnalysis(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${BASE_URL}/api/analyses/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean; message: string }>(res);
}

// ─── Upload (Phase 1 & 3) ─────────────────────────────────────────────────

/**
 * Upload a log file with XHR so we can track real progress (0–100%).
 * @param file       — the File object from the input/drop
 * @param analysisId — optional analysis workspace ID
 * @param onProgress — callback with 0-100 progress %
 */
export function uploadLogFile(
  file: File,
  analysisIdOrProgress?: string | ((pct: number) => void),
  onProgressCallback?: (pct: number) => void
): Promise<UploadResult> {
  const analysisId = typeof analysisIdOrProgress === 'string' ? analysisIdOrProgress : undefined;
  const onProgress = typeof analysisIdOrProgress === 'function' ? analysisIdOrProgress : onProgressCallback;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd  = new FormData();
    fd.append('file', file);
    if (analysisId) {
      fd.append('analysisId', analysisId);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const body = JSON.parse(xhr.responseText) as UploadResult & { error?: string };
        if (xhr.status >= 400) {
          reject(new Error(body.error ?? `Upload failed (HTTP ${xhr.status})`));
        } else {
          resolve(body);
        }
      } catch {
        reject(new Error('Invalid server response during upload.'));
      }
    });

    xhr.addEventListener('error', () => {
      const host = BASE_URL.replace(/^https?:\/\//, '');
      reject(new Error(
        `Network error during upload. Cannot reach backend at ${host}. ` +
        `Ensure the server is running.`
      ));
    });
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted.')));

    xhr.open('POST', `${BASE_URL}/api/logs/upload`);
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.withCredentials = true;
    xhr.send(fd);
  });
}

// ─── Log Files ────────────────────────────────────────────────────────────

export async function getLogFiles(page = 1, limit = 20): Promise<PaginatedLogFiles> {
  const res = await apiFetch(`${BASE_URL}/api/logs?page=${page}&limit=${limit}`);
  return handleResponse<PaginatedLogFiles>(res);
}

export async function getLogFile(id: string): Promise<{ success: boolean; data: LogFile }> {
  const res = await apiFetch(`${BASE_URL}/api/logs/${id}`);
  return handleResponse<{ success: boolean; data: LogFile }>(res);
}

export async function deleteLogFile(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${BASE_URL}/api/logs/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean; message: string }>(res);
}

// ─── Log Records ──────────────────────────────────────────────────────────

export interface RecordsQueryParams {
  page?:    number;
  limit?:   number;
  search?:  string;
  level?:   string;
  sortBy?:  string;
  sortDir?: 'asc' | 'desc';
}

export async function getLogRecords(
  fileId: string,
  params: RecordsQueryParams = {}
): Promise<PaginatedLogRecords> {
  const { page = 1, limit = 50, search = '', level = '', sortBy = 'rowIndex', sortDir = 'asc' } = params;
  const qs = new URLSearchParams({
    page:    String(page),
    limit:   String(limit),
    search,
    level,
    sortBy,
    sortDir,
  });
  const res = await apiFetch(`${BASE_URL}/api/logs/${fileId}/records?${qs}`);
  return handleResponse<PaginatedLogRecords>(res);
}

// ─── Threat Detection & Statistics ─────────────────────────────────────────

export async function analyzeLogFile(
  id: string
): Promise<{ success: boolean; fileId: string; eventsAnalyzed: number; threatsDetected: number; threats: ThreatEvent[] }> {
  const res = await apiFetch(`${BASE_URL}/api/logs/${id}/analyze`, { method: 'POST' });
  return handleResponse<{ success: boolean; fileId: string; eventsAnalyzed: number; threatsDetected: number; threats: ThreatEvent[] }>(res);
}

export async function getThreats(): Promise<{ success: boolean; data: ThreatEvent[] }> {
  const res = await apiFetch(`${BASE_URL}/api/threats`);
  return handleResponse<{ success: boolean; data: ThreatEvent[] }>(res);
}

export async function getThreat(id: string): Promise<{ success: boolean; data: ThreatEvent }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}`);
  return handleResponse<{ success: boolean; data: ThreatEvent }>(res);
}

export async function getLogFileThreats(fileId: string): Promise<{ success: boolean; data: ThreatEvent[] }> {
  const res = await apiFetch(`${BASE_URL}/api/logs/${fileId}/threats`);
  return handleResponse<{ success: boolean; data: ThreatEvent[] }>(res);
}

export async function getDashboardStats(): Promise<{ success: boolean; data: DashboardStats }> {
  const res = await apiFetch(`${BASE_URL}/api/stats`);
  return handleResponse<{ success: boolean; data: DashboardStats }>(res);
}

// ─── AI Agent Endpoints ────────────────────────────────────────────────────

export async function getThreatAnalysis(id: string): Promise<{ success: boolean; threatId: string; analysis: ThreatAnalysis }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/analysis`);
  return handleResponse<{ success: boolean; threatId: string; analysis: ThreatAnalysis }>(res);
}

export async function analyzeThreat(id: string): Promise<{ success: boolean; threatId: string; analysis: ThreatAnalysis }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/analyze`, { method: 'POST' });
  return handleResponse<{ success: boolean; threatId: string; analysis: ThreatAnalysis }>(res);
}

export async function getIncidentSummary(id: string): Promise<{ success: boolean; threatId: string; summary: IncidentSummary }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/summary`);
  return handleResponse<{ success: boolean; threatId: string; summary: IncidentSummary }>(res);
}

export async function summarizeThreat(id: string): Promise<{ success: boolean; threatId: string; summary: IncidentSummary }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/summarize`, { method: 'POST' });
  return handleResponse<{ success: boolean; threatId: string; summary: IncidentSummary }>(res);
}

export async function getRiskAssessment(id: string): Promise<{ success: boolean; threatId: string; riskAssessment: RiskAssessment }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/risk-assessment`);
  return handleResponse<{ success: boolean; threatId: string; riskAssessment: RiskAssessment }>(res);
}

export async function assessThreatRisk(id: string): Promise<{ success: boolean; threatId: string; riskAssessment: RiskAssessment }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/risk-assessment`, { method: 'POST' });
  return handleResponse<{ success: boolean; threatId: string; riskAssessment: RiskAssessment }>(res);
}

export async function getRecommendations(id: string): Promise<{ success: boolean; threatId: string; recommendation: ResponseRecommendation }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/recommendations`);
  return handleResponse<{ success: boolean; threatId: string; recommendation: ResponseRecommendation }>(res);
}

export async function generateRecommendations(id: string): Promise<{ success: boolean; threatId: string; recommendation: ResponseRecommendation }> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/recommendations`, { method: 'POST' });
  return handleResponse<{ success: boolean; threatId: string; recommendation: ResponseRecommendation }>(res);
}

// ─── AI Investigation Orchestrator ────────────────────────────────────────

export async function getAIInvestigation(id: string): Promise<AIInvestigationResponse> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/ai-investigation`);
  return handleResponse<AIInvestigationResponse>(res);
}

export async function runAIInvestigation(id: string): Promise<AIInvestigationResponse> {
  const res = await apiFetch(`${BASE_URL}/api/threats/${id}/ai-investigation`, { method: 'POST' });
  return handleResponse<AIInvestigationResponse>(res);
}
