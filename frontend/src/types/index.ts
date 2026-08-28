// ─── Phase 3 — User & Analysis Types ───────────────────────────────────────

export interface User {
  id:        string;
  name:      string;
  email:     string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?:   string;
  user:     User;
  error?:   string;
}

export interface AnalysisSummary {
  id:           string;
  name:         string;
  description?: string | null;
  status:       string;
  fileCount:    number;
  totalRecords: number;
  threatCount:  number;
  severity:     string | null;
  createdAt:    string;
  updatedAt:    string;
  logFiles?:    LogFile[];
}

export interface AnalysisDetail {
  id:           string;
  userId:       string;
  name:         string;
  description?: string | null;
  status:       string;
  createdAt:    string;
  updatedAt:    string;
  logFiles:     LogFile[];
}

// ─── Phase 1 — Real Log Ingestion Types ──────────────────────────────────

export interface LogFile {
  id:            string;
  analysisId?:   string;
  fileName?:     string;
  originalName:  string;
  fileSize:      number;    // bytes
  logType:       string;    // CSV | JSON | SYSLOG | WINDOWS_EVENT | FIREWALL | GENERIC
  totalLines:    number;
  parsedRecords: number;
  errorCount:    number;
  status:        'PROCESSING' | 'READY' | 'ERROR' | string;
  uploadedAt:    string;    // ISO timestamp
  threatCount?:  number;
  threatEvents?: ThreatEvent[];
}

export interface LogRecord {
  id:        string;
  fileId:    string;
  rowIndex:  number;
  raw:       string;
  timestamp?: string;
  level?:    string;
  source?:   string;
  message?:  string;
  extra?:    string;   // JSON string with additional fields
}

export interface UploadResult {
  success: boolean;
  message: string;
  file:    LogFile;
  summary: {
    logType:       string;
    totalLines:    number;
    parsedRecords: number;
    errorCount:    number;
  };
}

export interface Pagination {
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

export interface PaginatedLogFiles {
  success:    boolean;
  data:       LogFile[];
  pagination: Pagination;
}

export interface PaginatedLogRecords {
  success:    boolean;
  data:       LogRecord[];
  pagination: Pagination;
}

export interface HealthStatus {
  status:    string;
  system:    string;
  version:   string;
  timestamp: string;
  database:  string;
}

export interface ApiError {
  success: false;
  error:   string;
  details?: string;
}

// ─── Phase 2 — AI Types (reserved, not yet used) ─────────────────────────

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface ThreatAlert {
  id:                string;
  fileId?:           string;
  title:             string;
  severity:          ThreatSeverity;
  riskScore:         number;
  category:          string;
  status:            string;
  mitreTechniqueId?:   string;
  mitreTechniqueName?: string;
  tactic?:           string;
  summary:           string;
  aiReasoning?:      string;
  createdAt:         string;
}

export interface AgentInfo {
  id:     string;
  name:   string;
  status: string;
}

// ─── Phase 2A — Threat Event Types ────────────────────────────────────────

export interface ThreatEvent {
  id:              string;
  fileId?:         string;
  title:           string;
  category:        string;
  severity:        ThreatSeverity;
  riskScore:       number;

  description:     string;
  evidence:        any;
  sourceRecordIds: string[];
  status:          string;
  detectedAt:      string;
  createdAt:       string;
  updatedAt:       string;
}

export interface DashboardStats {
  totalFiles:      number;
  totalRecords:    number;
  totalThreats:    number;
  highThreats:     number;
  mediumThreats:   number;
}

export interface ThreatAnalysis {
  id:                      string;
  threatEventId:           string;
  assessment:              string;
  threatType:              string;
  summary:                 string;
  reasoning:               string;
  evidence:                string[];
  potentialImpact:         string;
  uncertainties:           string[];
  recommendedInvestigation: string[];
  confidence:              number;
  model:                   string;
  promptVersion:           string;
  createdAt:               string;
  updatedAt:               string;
}

export interface IncidentSummary {
  id:               string;
  threatEventId:    string;
  threatAnalysisId: string;
  incidentTitle:    string;
  executiveSummary: string;
  timelineSummary:  string;
  target:           string;
  source:           string;
  observedActivity: string;
  impactSummary:    string;
  evidenceSummary:  string[];
  uncertainties:    string[];
  model:            string;
  promptVersion:    string;
  createdAt:        string;
  updatedAt:        string;
}

export interface RiskAssessment {
  id:                string;
  threatEventId:     string;
  threatAnalysisId:  string;
  incidentSummaryId?: string;
  likelihood:        'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact:            'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  evidenceStrength:  'LOW' | 'MEDIUM' | 'HIGH';
  riskScore:         number;
  riskLevel:         'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority:          'P1' | 'P2' | 'P3' | 'P4';
  rationale:         string;
  riskFactors:       string[];
  uncertainties:     string[];
  model:             string;
  promptVersion:     string;
  createdAt:         string;
  updatedAt:         string;
}

export interface ImmediateActionItem {
  action:   string;
  reason:   string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ActionReasonItem {
  action: string;
  reason: string;
}

export interface ContainmentOptionItem {
  action:    string;
  condition: string;
  reason:    string;
}

export interface ResponseRecommendation {
  id:                         string;
  threatEventId:              string;
  threatAnalysisId:           string;
  incidentSummaryId?:          string;
  riskAssessmentId:           string;
  immediateActions:           ImmediateActionItem[];
  investigationSteps:         ActionReasonItem[];
  containmentOptions:         ContainmentOptionItem[];
  mitigationActions:          ActionReasonItem[];
  monitoringRecommendations:  ActionReasonItem[];
  overallRecommendation:      string;
  humanReviewRequired:        boolean;
  uncertainties:              string[];
  model:                      string;
  promptVersion:              string;
  createdAt:                  string;
  updatedAt:                  string;
}

export interface AIInvestigationStage {
  status: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  name: string;
  error?: string;
}

export interface AIInvestigationResponse {
  success: boolean;
  threatId: string;
  overallStatus: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  stages: {
    agent1: AIInvestigationStage;
    agent2: AIInvestigationStage;
    agent3: AIInvestigationStage;
    agent4: AIInvestigationStage;
  };
  outputs: {
    threatAnalysis: ThreatAnalysis | null;
    incidentSummary: IncidentSummary | null;
    riskAssessment: RiskAssessment | null;
    recommendation: ResponseRecommendation | null;
  };
  error?: string;
}





