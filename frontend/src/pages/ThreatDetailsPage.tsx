import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  ShieldAlert, RefreshCw, Loader2, Brain, AlertCircle,
  CheckCircle2, Play, ChevronDown, ChevronUp, Plus,
  ShieldCheck, ArrowLeft, Trash2, FileText, Activity, Layers,
  ExternalLink
} from 'lucide-react';
import type {
  ThreatEvent, ThreatAnalysis, IncidentSummary, RiskAssessment,
  ResponseRecommendation, AIInvestigationResponse, LogFile, AnalysisDetail
} from '../types';
import {
  getThreats, getThreat, getLogFileThreats, getLogFile, getAnalysis,
  getAIInvestigation, runAIInvestigation, deleteLogFile, deleteAnalysis
} from '../lib/api';
import { LogTable } from '../components/logs/LogTable';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function severityBadgeClass(s: string) {
  if (s === 'CRITICAL' || s === 'HIGH') return 'badge-danger';
  if (s === 'MEDIUM') return 'badge-warning';
  return 'badge-low';
}

function stageLabel(status: string): string {
  switch (status) {
    case 'NOT_STARTED': return 'Waiting';
    case 'RUNNING':
    case 'IN_PROGRESS': return 'Analyzing…';
    case 'COMPLETED':   return 'Completed';
    case 'FAILED':
    case 'ERROR':       return 'Failed';
    default:            return status;
  }
}

function stageColor(status: string): string {
  switch (status) {
    case 'COMPLETED':   return '#F5F2EA';
    case 'RUNNING':
    case 'IN_PROGRESS': return '#D9B679';
    case 'FAILED':
    case 'ERROR':       return '#D97979';
    default:            return '#6B6860';
  }
}

const AGENT_STAGES = [
  { key: 'agent1', num: '01', name: 'Threat Analysis',        question: 'What is happening?' },
  { key: 'agent2', num: '02', name: 'Incident Summary',       question: 'What happened?' },
  { key: 'agent3', num: '03', name: 'Risk Assessment',        question: 'How serious is it?' },
  { key: 'agent4', num: '04', name: 'Response Recommendation',question: 'What should I investigate next?' },
];

export const ThreatDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeId } = useParams<{ id?: string }>();

  const fileIdParam = searchParams.get('fileId') || routeId;
  const analysisIdParam = searchParams.get('analysisId');
  const threatIdParam = searchParams.get('threatId');

  const [threats,          setThreats]          = useState<ThreatEvent[]>([]);
  const [selectedId,       setSelectedId]       = useState<string | null>(null);
  const [selectedLogFile,  setSelectedLogFile]  = useState<LogFile | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting,      setIsDeleting]      = useState(false);
  const [deleteError,     setDeleteError]     = useState<string | null>(null);

  // Investigation state
  const [investigationData, setInvestigationData] = useState<AIInvestigationResponse | null>(null);
  const [invLoading,        setInvLoading]        = useState(false);
  const [invError,          setInvError]          = useState<string | null>(null);
  const [running,           setRunning]           = useState(false);

  // Expandable result sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    analysis: true, summary: true, risk: true, recommendation: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedLogFile(null);
    setSelectedAnalysis(null);

    try {
      if (fileIdParam) {
        try {
          // Fetch specific log file and its threats
          const [fileRes, threatsRes] = await Promise.all([
            getLogFile(fileIdParam),
            getLogFileThreats(fileIdParam),
          ]);
          setSelectedLogFile(fileRes.data);
          setThreats(threatsRes.data);

          if (threatsRes.data.length > 0) {
            const match = threatIdParam
              ? threatsRes.data.find(t => t.id === threatIdParam)
              : null;
            setSelectedId(match ? match.id : threatsRes.data[0].id);
          } else {
            setSelectedId(null);
          }
        } catch {
          // Fallback: check if fileIdParam was an analysisId
          const analysisRes = await getAnalysis(fileIdParam);
          setSelectedAnalysis(analysisRes.data);

          const allThreats: ThreatEvent[] = [];
          if (analysisRes.data.logFiles && analysisRes.data.logFiles.length > 0) {
            const firstFile = analysisRes.data.logFiles[0];
            setSelectedLogFile(firstFile);
            for (const f of analysisRes.data.logFiles) {
              if (f.threatEvents) {
                allThreats.push(...f.threatEvents);
              }
            }
          }
          setThreats(allThreats);

          if (allThreats.length > 0) {
            const match = threatIdParam ? allThreats.find(t => t.id === threatIdParam) : null;
            setSelectedId(match ? match.id : allThreats[0].id);
          } else {
            setSelectedId(null);
          }
        }
      } else if (analysisIdParam) {
        // Fetch specific analysis and its files/threats
        const analysisRes = await getAnalysis(analysisIdParam);
        setSelectedAnalysis(analysisRes.data);

        const allThreats: ThreatEvent[] = [];
        if (analysisRes.data.logFiles && analysisRes.data.logFiles.length > 0) {
          const firstFile = analysisRes.data.logFiles[0];
          setSelectedLogFile(firstFile);
          for (const f of analysisRes.data.logFiles) {
            if (f.threatEvents) {
              allThreats.push(...f.threatEvents);
            }
          }
        }
        setThreats(allThreats);

        if (allThreats.length > 0) {
          const match = threatIdParam ? allThreats.find(t => t.id === threatIdParam) : null;
          setSelectedId(match ? match.id : allThreats[0].id);
        } else {
          setSelectedId(null);
        }
      } else if (threatIdParam) {
        // Fetch specific threat directly
        const threatRes = await getThreat(threatIdParam);
        setThreats([threatRes.data]);
        setSelectedId(threatRes.data.id);
        if (threatRes.data.fileId) {
          try {
            const fRes = await getLogFile(threatRes.data.fileId);
            setSelectedLogFile(fRes.data);
          } catch { /* optional */ }
        }
      } else {
        // Default: load all user's threats
        const res = await getThreats();
        setThreats(res.data);
        if (res.data.length > 0) {
          setSelectedId(res.data[0].id);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to retrieve analysis intelligence.');
    } finally {
      setLoading(false);
    }
  }, [fileIdParam, analysisIdParam, threatIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadInvestigation = useCallback(async (threatId: string) => {
    setInvLoading(true);
    setInvError(null);
    setInvestigationData(null);
    try {
      const res = await getAIInvestigation(threatId);
      if (res.success) setInvestigationData(res);
    } catch (e: any) {
      if (!e?.message?.includes('404')) {
        setInvError(e?.message ?? 'Failed to load AI investigation status.');
      }
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadInvestigation(selectedId);
    }
  }, [selectedId, loadInvestigation]);

  const handleRunInvestigation = async () => {
    if (!selectedId) return;
    setRunning(true);
    setInvError(null);
    try {
      const res = await runAIInvestigation(selectedId);
      if (res.success) {
        setInvestigationData(res);
      } else {
        setInvError((res as any).error ?? 'AI investigation completed with errors.');
      }
    } catch (e: any) {
      setInvError(e?.message ?? 'Failed to execute AI investigation.');
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteCurrent = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (fileIdParam) {
        await deleteLogFile(fileIdParam);
      } else if (analysisIdParam) {
        await deleteAnalysis(analysisIdParam);
      } else if (selectedLogFile?.id) {
        await deleteLogFile(selectedLogFile.id);
      } else if (selectedThreat?.fileId) {
        await deleteLogFile(selectedThreat.fileId);
      }
      setDeleteModalOpen(false);
      navigate('/analyses');
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Failed to delete analysis.');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedThreat  = threats.find((t) => t.id === selectedId) ?? null;
  const analysis        = investigationData?.outputs?.threatAnalysis ?? null;
  const summary         = investigationData?.outputs?.incidentSummary ?? null;
  const riskAssessment  = investigationData?.outputs?.riskAssessment ?? null;
  const recommendation  = investigationData?.outputs?.recommendation ?? null;
  const isCompleted     = investigationData?.overallStatus === 'COMPLETED';

  const isSpecificView = Boolean(fileIdParam || analysisIdParam);
  const isBenign = isSpecificView && threats.length === 0;

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 64 }}>

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Analysis?"
        itemName={selectedLogFile?.originalName || selectedAnalysis?.name || selectedThreat?.title}
        message="This will permanently remove this analysis and its associated investigation data."
        isDeleting={isDeleting}
        onConfirm={handleDeleteCurrent}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          {isSpecificView && (
            <button
              onClick={() => navigate('/analyses')}
              className="btn-ghost"
              style={{ padding: 0, marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <ArrowLeft size={14} /> Back to All Analyses
            </button>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isBenign ? 'Security Ingestion & Audit' : 'Detection Engine Output'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {isBenign
                ? (selectedLogFile?.originalName?.replace(/\.[^/.]+$/, '') || 'Benign Analysis')
                : 'Threat Intelligence'}
            </h1>
            {isBenign && (
              <span className="badge badge-low" style={{ color: '#22C55E', borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.08)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <ShieldCheck size={13} /> CLEAN · NO THREATS
              </span>
            )}
          </div>

          <p className="page-description" style={{ margin: 0 }}>
            {isBenign
              ? `Log file normalized and verified with zero threat signatures detected across all security rules.`
              : `Review threats detected from your security logs and run multi-agent AI investigations.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          {(isSpecificView || selectedLogFile || selectedThreat) && (
            <button
              className="btn-danger"
              onClick={() => setDeleteModalOpen(true)}
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Delete this analysis and its records"
            >
              <Trash2 size={14} />
              Delete Analysis
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate('/analyses/new')}
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} />
            New Analysis
          </button>
        </div>
      </div>

      {/* Delete error notification */}
      {deleteError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: 'rgba(217, 121, 121, 0.08)',
            border: '1px solid rgba(217, 121, 121, 0.2)',
            borderRadius: 4,
            fontSize: 13,
            color: '#D97979',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '64px 0' }}>
          <Loader2 size={18} color="var(--text-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading analysis data…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '16px 20px',
            background: 'rgba(217,121,121,0.08)',
            border: '1px solid rgba(217,121,121,0.2)',
            borderRadius: 4,
          }}
        >
          <AlertCircle size={18} color="#D97979" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#D97979', marginBottom: 4 }}>Error Loading Analysis</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* SCENARIO 1: BENIGN FILE / NO THREATS DETECTED VIEW                   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {!loading && !error && isBenign && selectedLogFile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Top Posture Banner */}
          <div
            className="card"
            style={{
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              borderLeft: '4px solid #22C55E',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="badge badge-low" style={{ color: '#22C55E', borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.08)' }}>
                    SECURITY AUDIT: PASSED
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    ID: {selectedLogFile.id}
                  </span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {selectedLogFile.originalName}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  Deterministic threat detection engine evaluated all {selectedLogFile.parsedRecords.toLocaleString()} log records. Zero anomalous patterns or known threat signatures were matched.
                </p>
              </div>

              {/* Score Widget */}
              <div
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '12px 20px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 2 }}>
                  Health Score
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#22C55E', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                    100
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    /100
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', display: 'block', marginTop: 4 }}>
                  ● Zero Threat Risk
                </span>
              </div>
            </div>

            {/* Ingestion & Rule Evaluation Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '14px 16px',
              }}
            >
              {[
                { label: 'STATUS',            value: selectedLogFile.status,                mono: true },
                { label: 'FORMAT / LOG TYPE', value: selectedLogFile.logType,               mono: true },
                { label: 'RECORDS PARSED',    value: `${selectedLogFile.parsedRecords.toLocaleString()} events`, mono: true },
                { label: 'FILE SIZE',         value: formatBytes(selectedLogFile.fileSize), mono: true },
                { label: 'PARSING ERRORS',    value: `${selectedLogFile.errorCount} skipped`, mono: true },
                { label: 'INGESTED AT',       value: new Date(selectedLogFile.uploadedAt).toLocaleString(), mono: true },
              ].map((item) => (
                <div key={item.label}>
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: item.mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rule Evaluation Checklist */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>
              DETERMINISTIC RULE SIGNATURES EVALUATED
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 10,
              }}
            >
              {[
                { category: 'Brute Force Authentication', desc: 'Threshold failed login attempts by IP/User', hits: 0 },
                { category: 'Privilege Escalation', desc: 'Sudo/root anomalies and permission changes', hits: 0 },
                { category: 'SQL Injection / Web Attacks', desc: 'Malicious payload signatures and syntax probes', hits: 0 },
                { category: 'Port Scan / Reconnaissance', desc: 'High-frequency sequential port/IP probing', hits: 0 },
                { category: 'Unauthorized API Access', desc: 'Missing authorization headers / invalid JWTs', hits: 0 },
                { category: 'Lateral Movement', desc: 'Internal cross-workstation credential passing', hits: 0 },
                { category: 'Data Exfiltration Traffic', desc: 'Outbound bulk anomalies over unauthorized ports', hits: 0 },
                { category: 'Ransomware / Encryption Activity', desc: 'Mass file extension mutation signatures', hits: 0 },
              ].map((rule) => (
                <div
                  key={rule.category}
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                      {rule.category}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {rule.desc}
                    </span>
                  </div>
                  <span className="badge badge-low" style={{ fontSize: 10, color: '#22C55E', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', flexShrink: 0 }}>
                    ✓ 0 Hits
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Log Record Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Ingested Log Records Audit
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
                  Raw verified records extracted and stored for this analysis
                </p>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                {selectedLogFile.parsedRecords.toLocaleString()} Total Records
              </span>
            </div>
            <LogTable fileId={selectedLogFile.id} />
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* SCENARIO 2: GLOBAL EMPTY STATE (NO THREATS AT ALL)                  */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {!loading && !error && !isBenign && threats.length === 0 && (
        <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
          <ShieldCheck size={40} color="#22C55E" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            No Threats Detected
          </h3>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.65 }}>
            No threat detections were found for your workspace. Upload new security log files to run the detection engine and investigate incidents.
          </p>
          <button className="btn-primary" onClick={() => navigate('/analyses/new')} style={{ fontSize: 13 }}>
            <Plus size={14} /> Start New Analysis
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* SCENARIO 3: THREAT ANALYSIS VIEW                                     */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {!loading && !error && threats.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: threats.length > 1 ? 'minmax(280px, 340px) 1fr' : '1fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* ── LEFT: Threat List (if multiple) ── */}
          {threats.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="section-label">
                DETECTED THREATS ({threats.length})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {threats.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedId(t.id);
                        setSearchParams(prev => {
                          const updated = new URLSearchParams(prev);
                          updated.set('threatId', t.id);
                          return updated;
                        });
                      }}
                      style={{
                        padding: '14px 16px',
                        background:   isSelected ? 'var(--text-primary)' : 'var(--surface)',
                        color:        isSelected ? 'var(--bg)' : 'var(--text-primary)',
                        border:       `1px solid ${isSelected ? 'var(--text-primary)' : 'var(--border)'}`,
                        borderRadius: 4,
                        cursor:       'pointer',
                        textAlign:    'left',
                        transition:   'all 0.15s ease',
                        width:        '100%',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--text-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: isSelected ? 'var(--bg)' : 'var(--text-muted)' }}>
                          {t.category}
                        </span>
                        <span className={`badge ${severityBadgeClass(t.severity)}`}>
                          {t.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px 0', lineHeight: 1.3, color: isSelected ? 'var(--bg)' : 'var(--text-primary)' }}>
                        {t.title}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: isSelected ? 'var(--bg)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        <span>Detection Score: <strong style={{ color: isSelected ? 'var(--bg)' : 'var(--text-primary)' }}>{t.riskScore}/100</strong></span>
                        <span>{timeAgo(t.detectedAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RIGHT: Inspection Panel ── */}
          {selectedThreat ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }} className="card card-accent">

              {/* Threat header */}
              <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className={`badge ${severityBadgeClass(selectedThreat.severity)}`}>
                      {selectedThreat.severity} THREAT
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      ID: {selectedThreat.id.substring(0, 13)}…
                    </span>
                  </div>

                  {selectedLogFile && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      Source File: <strong style={{ color: 'var(--text-primary)' }}>{selectedLogFile.originalName}</strong>
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                  {selectedThreat.title}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
                  {selectedThreat.description}
                </p>
              </div>

              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                {/* Detection metadata */}
                <div>
                  <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>
                    DETERMINISTIC DETECTION
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 12,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      padding: '14px 16px',
                      borderRadius: 4,
                    }}
                  >
                    {[
                      { label: 'CATEGORY',        value: selectedThreat.category,       mono: true },
                      { label: 'DETECTION SCORE', value: `${selectedThreat.riskScore} / 100`, mono: true },
                      { label: 'STATUS',          value: selectedThreat.status,         mono: true },
                      { label: 'DETECTED AT',     value: new Date(selectedThreat.detectedAt).toLocaleString(), mono: true },
                    ].map((item) => (
                      <div key={item.label}>
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: item.mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence */}
                <div>
                  <span className="section-label" style={{ display: 'block', marginBottom: 8 }}>
                    WHY WAS THIS DETECTED?
                  </span>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.65 }}>
                    The following evidence was correlated by the detection engine:
                  </p>
                  <div className="code-block">
                    {typeof selectedThreat.evidence === 'string'
                      ? selectedThreat.evidence
                      : JSON.stringify(selectedThreat.evidence, null, 2)}
                  </div>
                </div>

                {/* AI Investigation */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Brain size={20} color="var(--text-primary)" />
                      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                        AI Investigation
                      </h3>
                    </div>
                    {isCompleted && (
                      <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 10px' }}>
                        <CheckCircle2 size={12} /> 4 / 4 AGENTS COMPLETED
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.65 }}>
                    Use four specialized AI agents to investigate this threat through sequential reasoning stages.
                  </p>

                  {/* Agent pipeline preview */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 8,
                      marginBottom: 20,
                    }}
                  >
                    {AGENT_STAGES.map((s) => {
                      const stageData = investigationData?.stages?.[s.key as keyof typeof investigationData.stages];
                      const status = stageData?.status ?? 'NOT_STARTED';
                      const color  = stageColor(status);
                      return (
                        <div
                          key={s.key}
                          style={{
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: '12px 14px',
                          }}
                        >
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4 }}>
                            {s.num}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                            {s.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace' }}>
                              {stageLabel(status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI error */}
                  {invError && (
                    <div style={{ background: 'rgba(217,121,121,0.08)', border: '1px solid rgba(217,121,121,0.2)', padding: '12px 16px', borderRadius: 4, marginBottom: 16, fontSize: 14, color: '#D97979' }}>
                      {invError}
                    </div>
                  )}

                  {/* Run button — shown if not completed and not running */}
                  {!isCompleted && !running && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <button
                        className="btn-primary"
                        onClick={handleRunInvestigation}
                        disabled={running || invLoading}
                        style={{ fontSize: 14, padding: '11px 28px' }}
                      >
                        <Play size={15} />
                        Run AI Investigation
                      </button>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        Results are advisory and require human review.
                      </p>
                    </div>
                  )}

                  {/* Running state */}
                  {running && (
                    <div
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        padding: '20px 24px',
                        borderRadius: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Loader2 size={18} color="var(--text-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Executing AI Investigation Pipeline…
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {AGENT_STAGES.map((s) => (
                          <div
                            key={s.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              background: 'var(--surface)',
                              padding: '10px 14px',
                              borderRadius: 3,
                              border: '1px solid var(--border)',
                            }}
                          >
                            <Loader2 size={13} color="#D9B679" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {s.num} — {s.name}
                              </span>
                              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>
                                {s.question}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed results */}
                  {isCompleted && !running && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Executive Summary Banner */}
                      <div
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          padding: '20px 24px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#D9B679', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            AI Investigation Complete
                          </span>
                          <span className="badge badge-success" style={{ fontSize: 11 }}>
                            ADVISORY · SOC READY
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: 12,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: '14px 16px',
                            marginBottom: summary?.executiveSummary ? 16 : 0,
                          }}
                        >
                          <div>
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                              CONFIDENCE
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {analysis ? `${Math.round(analysis.confidence * 100)}%` : '—'}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                              RISK LEVEL
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {riskAssessment?.riskLevel ?? selectedThreat.severity}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                              CONTEXTUAL RISK SCORE
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {riskAssessment ? `${riskAssessment.riskScore} / 100` : '—'}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                              PRIORITY
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {riskAssessment?.priority ?? 'P2'}
                            </span>
                          </div>
                        </div>

                        {summary?.executiveSummary && (
                          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
                            {summary.executiveSummary}
                          </p>
                        )}
                      </div>

                      {/* Agent 01 — Threat Analysis */}
                      {analysis && (
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <button
                            onClick={() => toggle('analysis')}
                            style={{
                              width: '100%',
                              padding: '14px 20px',
                              background: 'var(--surface)',
                              border: 'none',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              gap: 10,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="badge badge-success" style={{ fontSize: 10 }}>✓ COMPLETED</span>
                              <div style={{ textAlign: 'left' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', display: 'block' }}>AGENT 01</span>
                                <span style={{ fontSize: 15, fontWeight: 700 }}>Threat Analysis</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={(e) => { e.stopPropagation(); navigate('/agents?agent=1'); }} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
                                View in Agent Lab
                              </button>
                              {expanded.analysis ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                            </div>
                          </button>
                          {expanded.analysis && (
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: 'var(--surface)', padding: '10px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', flexWrap: 'wrap' }}>
                                <span>Threat Type: <strong style={{ color: 'var(--text-primary)' }}>{analysis.threatType}</strong></span>
                                <span>Confidence: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(analysis.confidence * 100)}%</strong></span>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>Assessment</span>
                                <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.7 }}>{analysis.assessment}</p>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>Technical Reasoning</span>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>{analysis.reasoning}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Agent 02 — Incident Summary */}
                      {summary && (
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <button
                            onClick={() => toggle('summary')}
                            style={{
                              width: '100%',
                              padding: '14px 20px',
                              background: 'var(--surface)',
                              border: 'none',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              gap: 10,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="badge badge-success" style={{ fontSize: 10 }}>✓ COMPLETED</span>
                              <div style={{ textAlign: 'left' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', display: 'block' }}>AGENT 02</span>
                                <span style={{ fontSize: 15, fontWeight: 700 }}>Incident Summary</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={(e) => { e.stopPropagation(); navigate('/agents?agent=2'); }} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
                                View in Agent Lab
                              </button>
                              {expanded.summary ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                            </div>
                          </button>
                          {expanded.summary && (
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{summary.incidentTitle}</h4>
                              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>{summary.executiveSummary}</p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--surface)', padding: '10px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                                <div><span style={{ color: 'var(--text-muted)' }}>TARGET: </span><span style={{ color: 'var(--text-primary)' }}>{summary.target}</span></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>SOURCE: </span><span style={{ color: 'var(--text-primary)' }}>{summary.source}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Agent 03 — Risk Assessment */}
                      {riskAssessment && (
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <button
                            onClick={() => toggle('risk')}
                            style={{
                              width: '100%',
                              padding: '14px 20px',
                              background: 'var(--surface)',
                              border: 'none',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              gap: 10,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="badge badge-success" style={{ fontSize: 10 }}>✓ COMPLETED</span>
                              <div style={{ textAlign: 'left' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', display: 'block' }}>AGENT 03</span>
                                <span style={{ fontSize: 15, fontWeight: 700 }}>Risk Assessment</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={(e) => { e.stopPropagation(); navigate('/agents?agent=3'); }} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
                                View in Agent Lab
                              </button>
                              {expanded.risk ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                            </div>
                          </button>
                          {expanded.risk && (
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px 18px', borderRadius: 4 }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>Detection Score</span>
                                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                                    {selectedThreat.riskScore}
                                    <span style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 400 }}>/100</span>
                                  </span>
                                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>From deterministic engine</span>
                                </div>
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px 18px', borderRadius: 4 }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>Contextual Risk Score</span>
                                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                                    {riskAssessment.riskScore}
                                    <span style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 400 }}>/100</span>
                                  </span>
                                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>From AI risk calculation</span>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, background: 'var(--surface)', padding: '10px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                                {[
                                  { label: 'LIKELIHOOD',  value: riskAssessment.likelihood },
                                  { label: 'IMPACT',      value: riskAssessment.impact },
                                  { label: 'CRITICALITY', value: riskAssessment.targetCriticality },
                                  { label: 'EVIDENCE',    value: riskAssessment.evidenceStrength },
                                ].map((item) => (
                                  <div key={item.label}>
                                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10, marginBottom: 3, letterSpacing: '0.04em' }}>{item.label}</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{item.value}</strong>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>Rationale</span>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>{riskAssessment.rationale}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Agent 04 — Response Recommendation */}
                      {recommendation && (
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <button
                            onClick={() => toggle('recommendation')}
                            style={{
                              width: '100%',
                              padding: '14px 20px',
                              background: 'var(--surface)',
                              border: 'none',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              gap: 10,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="badge badge-success" style={{ fontSize: 10 }}>✓ COMPLETED</span>
                              <div style={{ textAlign: 'left' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', display: 'block' }}>AGENT 04</span>
                                <span style={{ fontSize: 15, fontWeight: 700 }}>Response Recommendation</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={(e) => { e.stopPropagation(); navigate('/agents?agent=4'); }} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
                                View in Agent Lab
                              </button>
                              {expanded.recommendation ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                            </div>
                          </button>
                          {expanded.recommendation && (
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                                  AI ADVISORY — HUMAN REVIEW REQUIRED
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Advisory Only · No Autonomous Action</span>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>Overall Response Strategy</span>
                                <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.7 }}>{recommendation.overallRecommendation}</p>
                              </div>
                              {recommendation.immediateActions && recommendation.immediateActions.length > 0 && (
                                <div>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>
                                    Immediate Actions ({recommendation.immediateActions.length})
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {recommendation.immediateActions.map((item, idx) => (
                                      <div key={idx} style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: 4, border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                          <span className="badge badge-accent" style={{ fontSize: 10 }}>{item.priority}</span>
                                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.action}</span>
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Reason: {item.reason}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Select a threat from the list to inspect.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
