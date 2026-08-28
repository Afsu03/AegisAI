import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, Loader2, RefreshCw, ShieldCheck, ChevronDown, ChevronUp, AlertCircle, Plus
} from 'lucide-react';
import type { ThreatEvent, ThreatAnalysis, IncidentSummary, RiskAssessment, ResponseRecommendation } from '../types';
import { getThreats, getThreatAnalysis, getIncidentSummary, getRiskAssessment, getRecommendations } from '../lib/api';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function severityBadgeClass(s: string) {
  if (s === 'CRITICAL' || s === 'HIGH') return 'badge-danger';
  if (s === 'MEDIUM') return 'badge-warning';
  return 'badge-low';
}

export const IncidentResponsePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlThreatId = searchParams.get('threatId');

  const [threats,        setThreats]        = useState<ThreatEvent[]>([]);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [analysis,       setAnalysis]       = useState<ThreatAnalysis | null>(null);
  const [summary,        setSummary]        = useState<IncidentSummary | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [recommendation, setRecommendation] = useState<ResponseRecommendation | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    immediate: true, investigation: true, containment: false, mitigation: false, monitoring: false,
  });

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const threatRes = await getThreats();
      setThreats(threatRes.data);
      if (threatRes.data.length > 0) {
        const id = (urlThreatId && threatRes.data.some(t => t.id === urlThreatId))
          ? urlThreatId
          : threatRes.data[0].id;
        setSelectedId(id);
        await loadIncidentDetails(id);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  }, [urlThreatId]);

  const loadIncidentDetails = async (id: string) => {
    setDetailLoading(true);
    setAnalysis(null);
    setSummary(null);
    setRiskAssessment(null);
    setRecommendation(null);
    try {
      const [aRes, sRes, rRes, recRes] = await Promise.allSettled([
        getThreatAnalysis(id),
        getIncidentSummary(id),
        getRiskAssessment(id),
        getRecommendations(id),
      ]);
      if (aRes.status   === 'fulfilled' && aRes.value.success)   setAnalysis(aRes.value.analysis);
      if (sRes.status   === 'fulfilled' && sRes.value.success)   setSummary(sRes.value.summary);
      if (rRes.status   === 'fulfilled' && rRes.value.success)   setRiskAssessment(rRes.value.riskAssessment);
      if (recRes.status === 'fulfilled' && recRes.value.success) setRecommendation(recRes.value.recommendation);
    } catch { /* no AI results yet */ }
    finally { setDetailLoading(false); }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectIncident = async (id: string) => {
    setSelectedId(id);
    await loadIncidentDetails(id);
  };

  const selectedThreat = threats.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Response Management
          </p>
          <h1 className="page-title" style={{ marginBottom: 10 }}>Incident Response</h1>
          <p className="page-description">
            Review security events that require investigation or response action.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
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

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '64px 0' }}>
          <Loader2 size={18} color="#F5F2EA" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#8C8981' }}>Loading incidents…</span>
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
            <p style={{ fontSize: 15, fontWeight: 600, color: '#D97979', marginBottom: 4 }}>Connection Error</p>
            <p style={{ fontSize: 14, color: '#8C8981' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && threats.length === 0 && (
        <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
          <Activity size={36} color="#3f3e3a" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F5F2EA', marginBottom: 8 }}>
            No Active Incidents
          </h3>
          <p style={{ fontSize: 15, color: '#8C8981', maxWidth: 420, margin: '0 auto', lineHeight: 1.65 }}>
            Incidents are created from analyzed threats requiring investigation or response.
            Upload security logs and run threat detection to create incidents.
          </p>
        </div>
      )}

      {/* Incident list + detail */}
      {!loading && !error && threats.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Incident table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1F1E1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="section-label">ACTIVE INCIDENT FEED</span>
                <span style={{ fontSize: 13, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', marginLeft: 8 }}>({threats.length})</span>
              </div>
              <span className="badge badge-neutral">HUMAN REVIEW REQUIRED</span>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident Title</th>
                  <th>Severity</th>
                  <th>Detection Score</th>
                  <th>Status</th>
                  <th>Detected</th>
                  <th style={{ textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {threats.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <tr key={t.id} style={{ background: isSelected ? 'var(--surface-muted)' : undefined }}>
                      <td>
                        <button
                          onClick={() => handleSelectIncident(t.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontSize: 14,
                            fontWeight: 600,
                            textAlign: 'left',
                            padding: 0,
                            display: 'block',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {t.title}
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${severityBadgeClass(t.severity)}`}>{t.severity}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#F5F2EA', fontWeight: 600 }}>
                          {t.riskScore} / 100
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">ACTIVE</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: '#8C8981', fontFamily: 'JetBrains Mono, monospace' }}>
                          {timeAgo(t.detectedAt)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleSelectIncident(t.id)}
                          className={isSelected ? 'btn-primary' : 'btn-secondary'}
                          style={{ fontSize: 13, padding: '6px 14px' }}
                        >
                          {isSelected ? 'Selected' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selectedThreat && (
            <div className="card card-accent" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Incident header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #1F1E1B', paddingBottom: 20, flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>INCIDENT INSPECTION</span>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F5F2EA', margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                    {selectedThreat.title}
                  </h2>
                  <p style={{ fontSize: 14, color: '#8C8981', margin: 0, lineHeight: 1.65 }}>
                    {selectedThreat.description}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span className={`badge ${severityBadgeClass(selectedThreat.severity)}`}>{selectedThreat.severity}</span>
                  {riskAssessment && (
                    <span className="badge badge-accent">PRIORITY {riskAssessment.priority}</span>
                  )}
                </div>
              </div>

              {/* Advisory banner */}
              <div style={{ background: '#181815', border: '1px solid #2A2926', padding: '12px 18px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShieldCheck size={18} color="#F5F2EA" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F5F2EA', fontFamily: 'JetBrains Mono, monospace' }}>
                    AI ADVISORY — HUMAN REVIEW REQUIRED
                  </span>
                </div>
                <span style={{ fontSize: 13, color: '#8C8981' }}>Advisory Only · No Autonomous Action</span>
              </div>

              {/* Score summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div style={{ background: '#0A0A0A', border: '1px solid #2A2926', padding: '16px 20px', borderRadius: 4 }}>
                  <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>Detection Score</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#F5F2EA', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                    {selectedThreat.riskScore}
                    <span style={{ fontSize: 15, color: '#6B6860', fontWeight: 400 }}>/100</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: '#6B6860', marginTop: 6 }}>Deterministic engine</span>
                </div>
                {riskAssessment && (
                  <div style={{ background: '#0A0A0A', border: '1px solid #2A2926', padding: '16px 20px', borderRadius: 4 }}>
                    <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>Contextual Risk Score</span>
                    <span style={{ fontSize: 28, fontWeight: 700, color: '#F5F2EA', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                      {riskAssessment.riskScore}
                      <span style={{ fontSize: 15, color: '#6B6860', fontWeight: 400 }}>/100</span>
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: '#6B6860', marginTop: 6 }}>AI risk calculation</span>
                  </div>
                )}
                {summary && (
                  <div style={{ background: '#0A0A0A', border: '1px solid #2A2926', padding: '16px 20px', borderRadius: 4 }}>
                    <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>AI Summary</span>
                    <p style={{ fontSize: 14, color: '#F5F2EA', margin: 0, lineHeight: 1.6 }}>{summary.incidentTitle}</p>
                  </div>
                )}
              </div>

              {/* Evidence timeline */}
              <div>
                <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>EVENT EVIDENCE TIMELINE</span>
                <div style={{ background: '#0A0A0A', border: '1px solid #2A2926', padding: '16px 20px', borderRadius: 4 }}>
                  <div style={{ position: 'relative', borderLeft: '2px solid #2A2926', paddingLeft: 20, marginLeft: 4 }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5F2EA', position: 'absolute', left: -24, top: 5 }} />
                      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6B6860', display: 'block', marginBottom: 4 }}>
                        {new Date(selectedThreat.detectedAt).toLocaleString()} UTC
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F2EA', display: 'block', marginBottom: 4 }}>
                        {selectedThreat.title} — Pattern Detection Triggered
                      </span>
                      <p style={{ fontSize: 13, color: '#8C8981', margin: 0, lineHeight: 1.6 }}>
                        Detected by deterministic engine. Detection score: {selectedThreat.riskScore}/100.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail loading */}
              {detailLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                  <Loader2 size={15} color="#6B6860" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 14, color: '#6B6860' }}>Loading AI investigation data…</span>
                </div>
              )}

              {/* AI Summary */}
              {!detailLoading && summary && (
                <div>
                  <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>AI INCIDENT SUMMARY</span>
                  <div style={{ background: '#0A0A0A', border: '1px solid #2A2926', padding: '16px 20px', borderRadius: 4 }}>
                    <h4 style={{ fontSize: 17, fontWeight: 700, color: '#F5F2EA', marginBottom: 8 }}>{summary.incidentTitle}</h4>
                    <p style={{ fontSize: 14, color: '#8C8981', margin: '0 0 12px', lineHeight: 1.7 }}>{summary.executiveSummary}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#11110F', padding: '10px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                      <div><span style={{ color: '#6B6860' }}>TARGET: </span><span style={{ color: '#F5F2EA' }}>{summary.target}</span></div>
                      <div><span style={{ color: '#6B6860' }}>SOURCE: </span><span style={{ color: '#F5F2EA' }}>{summary.source}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Response recommendations */}
              <div>
                <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>RESPONSE RECOMMENDATIONS</span>

                {!recommendation && !detailLoading ? (
                  <div style={{ padding: '20px 24px', background: '#0A0A0A', border: '1px solid #2A2926', borderRadius: 4 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F2EA', marginBottom: 6 }}>No recommendations yet</p>
                    <p style={{ fontSize: 14, color: '#8C8981', margin: 0, lineHeight: 1.65 }}>
                      Run an AI Investigation from the Threat Intelligence page to generate response recommendations.
                    </p>
                  </div>
                ) : recommendation && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Overall */}
                    <div style={{ background: '#0A0A0A', border: '1px solid #2A2926', padding: '14px 18px', borderRadius: 4 }}>
                      <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Overall Guidance</span>
                      <p style={{ fontSize: 14, color: '#F5F2EA', margin: 0, lineHeight: 1.7 }}>{recommendation.overallRecommendation}</p>
                    </div>

                    {/* Expandable sections */}
                    {[
                      { key: 'immediate',    label: 'Immediate Actions',         count: recommendation.immediateActions?.length ?? 0,    items: recommendation.immediateActions },
                      { key: 'investigation',label: 'Investigation Steps',        count: recommendation.investigationSteps?.length ?? 0,   items: recommendation.investigationSteps },
                      { key: 'containment',  label: 'Containment Options',        count: recommendation.containmentOptions?.length ?? 0,   items: recommendation.containmentOptions },
                      { key: 'mitigation',   label: 'Mitigation Actions',         count: recommendation.mitigationActions?.length ?? 0,    items: recommendation.mitigationActions },
                      { key: 'monitoring',   label: 'Monitoring Recommendations', count: recommendation.monitoringRecommendations?.length ?? 0, items: recommendation.monitoringRecommendations },
                    ].map((section) => (
                      <div key={section.key} style={{ background: '#0A0A0A', border: '1px solid #2A2926', borderRadius: 4, overflow: 'hidden' }}>
                        <button
                          onClick={() => toggle(section.key)}
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            background: '#181815',
                            border: 'none',
                            color: '#F5F2EA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            gap: 10,
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                            {section.label}
                            <span style={{ fontSize: 12, color: '#6B6860', fontWeight: 400, marginLeft: 8 }}>({section.count})</span>
                          </span>
                          {expanded[section.key] ? <ChevronUp size={16} color="#6B6860" /> : <ChevronDown size={16} color="#6B6860" />}
                        </button>
                        {expanded[section.key] && section.items && (
                          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {section.items.map((item: any, idx: number) => (
                              <div key={idx} style={{ background: '#11110F', padding: '10px 14px', borderRadius: 4, border: '1px solid #1F1E1B' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  {item.priority && <span className="badge badge-accent" style={{ fontSize: 10 }}>{item.priority}</span>}
                                  <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F2EA' }}>{item.action}</span>
                                </div>
                                {item.reason && <p style={{ fontSize: 13, color: '#8C8981', margin: 0, lineHeight: 1.6 }}>
                                  {section.key === 'containment' ? `Condition: ${item.condition}  ·  ` : ''}
                                  {item.reason}
                                </p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
