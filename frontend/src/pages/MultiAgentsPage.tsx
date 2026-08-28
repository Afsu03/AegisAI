import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bot, Brain, FileText, Activity, ShieldCheck, Loader2, ArrowRight, ChevronDown
} from 'lucide-react';
import type { ThreatEvent, ThreatAnalysis, IncidentSummary, RiskAssessment, ResponseRecommendation, AIInvestigationResponse } from '../types';
import { getThreats, getAIInvestigation } from '../lib/api';

const AGENTS = [
  {
    id: 1,
    key: 'agent1',
    label: 'AGENT 01',
    name: 'Threat Analysis',
    question: 'What is happening?',
    icon: Brain,
    purpose: 'Determines what suspicious activity is occurring based on the detected threat and correlated evidence.',
    input: 'ThreatEvent + Correlated LogRecords',
    output: 'Threat type, assessment, summary, reasoning, evidence, uncertainties',
  },
  {
    id: 2,
    key: 'agent2',
    label: 'AGENT 02',
    name: 'Incident Summary',
    question: 'What happened?',
    icon: FileText,
    purpose: 'Converts technical threat analysis into a concise, analyst-readable SOC incident summary.',
    input: 'ThreatAnalysis',
    output: 'Incident title, executive summary, timeline, target, source',
  },
  {
    id: 3,
    key: 'agent3',
    label: 'AGENT 03',
    name: 'Risk Assessment',
    question: 'How serious is it?',
    icon: Activity,
    purpose: 'Evaluates likelihood, impact, target criticality, and evidence strength. Backend deterministically calculates the numerical contextual risk score.',
    input: 'ThreatAnalysis + IncidentSummary',
    output: 'Contextual risk score, likelihood, impact, criticality, evidence strength, rationale',
  },
  {
    id: 4,
    key: 'agent4',
    label: 'AGENT 04',
    name: 'Response Recommendation',
    question: 'What should I investigate next?',
    icon: ShieldCheck,
    purpose: 'Generates evidence-based incident response recommendations across 5 structured categories for human security analyst review.',
    input: 'ThreatAnalysis + IncidentSummary + RiskAssessment',
    output: 'Immediate actions, investigation steps, containment options, mitigation actions, monitoring recommendations',
  },
];

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

function stageLabel(status: string): string {
  switch (status) {
    case 'NOT_STARTED': return '○ Waiting';
    case 'RUNNING':
    case 'IN_PROGRESS': return '● Analyzing…';
    case 'COMPLETED':   return '✓ Completed';
    case 'FAILED':
    case 'ERROR':       return '! Failed';
    default:            return status;
  }
}

export const MultiAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentParam = searchParams.get('agent');

  const getInitialTab = () => {
    if (agentParam === '2') return 2;
    if (agentParam === '3') return 3;
    if (agentParam === '4') return 4;
    return 1;
  };

  const [activeTab,        setActiveTab]        = useState<number>(getInitialTab());
  const [threats,          setThreats]          = useState<ThreatEvent[]>([]);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [investigation,    setInvestigation]    = useState<AIInvestigationResponse | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [threatDropOpen,   setThreatDropOpen]   = useState(false);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [agentParam]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const threatRes = await getThreats();
      setThreats(threatRes.data);
      if (threatRes.data.length > 0) {
        const id = threatRes.data[0].id;
        setSelectedThreatId(id);
        try {
          const invRes = await getAIInvestigation(id);
          if (invRes.success) setInvestigation(invRes);
        } catch { /* investigation may not exist yet */ }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectThreat = async (id: string) => {
    setSelectedThreatId(id);
    setInvestigation(null);
    setThreatDropOpen(false);
    try {
      const invRes = await getAIInvestigation(id);
      if (invRes.success) setInvestigation(invRes);
    } catch { /* no investigation yet */ }
  };

  const handleTabChange = (tabNum: number) => {
    setActiveTab(tabNum);
    setSearchParams({ agent: String(tabNum) });
  };

  const selectedThreat    = threats.find((t) => t.id === selectedThreatId) ?? null;
  const analysis: ThreatAnalysis | null          = investigation?.outputs?.threatAnalysis   ?? null;
  const summary: IncidentSummary | null          = investigation?.outputs?.incidentSummary  ?? null;
  const riskAssessment: RiskAssessment | null    = investigation?.outputs?.riskAssessment   ?? null;
  const recommendation: ResponseRecommendation | null = investigation?.outputs?.recommendation ?? null;

  const getAgentStatus = (agentKey: string): string => {
    if (!investigation) return 'NOT_STARTED';
    return investigation.stages?.[agentKey as keyof typeof investigation.stages]?.status ?? 'NOT_STARTED';
  };

  const activeAgent = AGENTS.find((a) => a.id === activeTab)!;

  const getOutputForActiveTab = () => {
    if (activeTab === 1) return analysis;
    if (activeTab === 2) return summary;
    if (activeTab === 3) return riskAssessment;
    if (activeTab === 4) return recommendation;
    return null;
  };

  const activeOutput = getOutputForActiveTab();
  const activeStatus = getAgentStatus(activeAgent.key);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ paddingBottom: 24, borderBottom: '1px solid #2A2926' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Bot size={22} color="#F5F2EA" />
          <p style={{ fontSize: 12, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            AI Intelligence
          </p>
        </div>
        <h1 className="page-title" style={{ marginBottom: 10 }}>AI Agent Lab</h1>
        <p className="page-description">
          Understand how each specialized AI agent transforms security evidence into intelligence.
          Run investigations from the{' '}
          <button
            onClick={() => navigate('/threats')}
            style={{ background: 'none', border: 'none', color: '#F5F2EA', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}
          >
            Threat Intelligence
          </button>{' '}
          page.
        </p>
      </div>

      {/* Investigation Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="section-label">SELECT INVESTIGATION</span>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#11110F', border: '1px solid #2A2926', borderRadius: 4 }}>
            <Loader2 size={15} color="#6B6860" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, color: '#6B6860' }}>Loading investigations…</span>
          </div>
        ) : threats.length === 0 ? (
          <div style={{ padding: '20px 24px', background: '#11110F', border: '1px solid #2A2926', borderRadius: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F2EA', marginBottom: 6 }}>
              No Investigations Available
            </p>
            <p style={{ fontSize: 14, color: '#8C8981', lineHeight: 1.65, marginBottom: 14 }}>
              Run an AI Investigation from a detected threat to inspect agent results here.
            </p>
            <button className="btn-primary" onClick={() => navigate('/threats')} style={{ fontSize: 13 }}>
              Go to Threat Intelligence <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setThreatDropOpen(!threatDropOpen)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#11110F',
                border: '1px solid #2A2926',
                borderRadius: 4,
                color: '#F5F2EA',
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3f3e3a')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2926')}
            >
              <div>
                {selectedThreat ? (
                  <>
                    <span style={{ fontWeight: 600, display: 'block' }}>{selectedThreat.title}</span>
                    <span style={{ fontSize: 12, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                      {selectedThreat.category} · Detection Score: {selectedThreat.riskScore}/100
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#6B6860' }}>Select a threat investigation…</span>
                )}
              </div>
              <ChevronDown size={16} color="#6B6860" />
            </button>

            {threatDropOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: '#11110F',
                  border: '1px solid #2A2926',
                  borderRadius: 4,
                  zIndex: 20,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
              >
                {threats.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectThreat(t.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: t.id === selectedThreatId ? '#181815' : 'none',
                      border: 'none',
                      borderBottom: '1px solid #1F1E1B',
                      color: '#F5F2EA',
                      fontSize: 14,
                      fontFamily: 'Inter, sans-serif',
                      display: 'block',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#181815')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = t.id === selectedThreatId ? '#181815' : 'none')}
                  >
                    <span style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>{t.title}</span>
                    <span style={{ fontSize: 12, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t.category} · Score: {t.riskScore}/100
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent selector tabs */}
      {!loading && threats.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              const isActive = activeTab === agent.id;
              const status   = getAgentStatus(agent.key);
              const color    = stageColor(status);
              return (
                <button
                  key={agent.id}
                  onClick={() => handleTabChange(agent.id)}
                  style={{
                    background:   isActive ? '#F5F2EA' : '#11110F',
                    color:        isActive ? '#0A0A0A' : '#F5F2EA',
                    border:       `1px solid ${isActive ? '#F5F2EA' : '#2A2926'}`,
                    borderRadius: 4,
                    padding:      '16px 14px',
                    textAlign:    'left',
                    display:      'flex',
                    flexDirection: 'column',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: isActive ? '#555' : '#6B6860' }}>
                      {agent.label}
                    </span>
                    <Icon size={15} color={isActive ? '#333' : '#6B6860'} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? '#0A0A0A' : '#F5F2EA', lineHeight: 1.3 }}>
                    {agent.name}
                  </span>
                  <span style={{ fontSize: 12, color: isActive ? '#555' : '#8C8981', lineHeight: 1.4 }}>
                    {agent.question}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#333' : color, fontFamily: 'JetBrains Mono, monospace' }}>
                      {stageLabel(status)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Agent Detail */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

            {/* Main panel */}
            <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Agent header */}
              <div style={{ borderBottom: '1px solid #1F1E1B', paddingBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6 }}>
                  {activeAgent.label}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F5F2EA', margin: '0 0 8px 0', letterSpacing: '-0.01em' }}>
                  {activeAgent.name}
                </h2>
                <p style={{ fontSize: 14, color: '#8C8981', margin: '0 0 12px', lineHeight: 1.65 }}>
                  {activeAgent.purpose}
                </p>
                <p style={{ fontSize: 15, color: '#C2BDB0', fontStyle: 'italic', margin: 0 }}>
                  "{activeAgent.question}"
                </p>
              </div>

              {/* Process flow */}
              <div>
                <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>PROCESS FLOW</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#181815',
                    padding: '12px 16px',
                    borderRadius: 4,
                    border: '1px solid #2A2926',
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#F5F2EA',
                    flexWrap: 'wrap',
                  }}
                >
                  {activeTab === 1 && (
                    <>
                      <span>EVIDENCE</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>CONTEXT</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>LLM REASONING</span><span style={{ color: '#6B6860' }}>→</span>
                      <strong>THREAT ANALYSIS</strong>
                    </>
                  )}
                  {activeTab === 2 && (
                    <>
                      <span>ANALYSIS</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>COMPRESSION</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>LLM</span><span style={{ color: '#6B6860' }}>→</span>
                      <strong>INCIDENT SUMMARY</strong>
                    </>
                  )}
                  {activeTab === 3 && (
                    <>
                      <span>CONTEXT</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>LLM CATEGORICAL</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>DETERMINISTIC SCORING</span><span style={{ color: '#6B6860' }}>→</span>
                      <strong>RISK ASSESSMENT</strong>
                    </>
                  )}
                  {activeTab === 4 && (
                    <>
                      <span>THREAT + RISK CONTEXT</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>LLM</span><span style={{ color: '#6B6860' }}>→</span>
                      <span>VALIDATION</span><span style={{ color: '#6B6860' }}>→</span>
                      <strong>HUMAN REVIEW</strong>
                    </>
                  )}
                </div>
              </div>

              {/* Input */}
              <div>
                <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>INPUT</span>
                <div style={{ background: '#181815', border: '1px solid #2A2926', padding: '12px 16px', borderRadius: 4 }}>
                  <p style={{ fontSize: 13, color: '#8C8981', margin: 0, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
                    {activeAgent.input}
                  </p>
                  {selectedThreat && activeTab === 1 && (
                    <div className="code-block" style={{ marginTop: 10 }}>
                      {`ThreatEvent: ${selectedThreat.title} [${selectedThreat.category}]\nDetection Score: ${selectedThreat.riskScore}/100\nEvidence: ${JSON.stringify(selectedThreat.evidence)}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Output */}
              <div>
                <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>
                  OUTPUT{activeOutput ? ` (${stageLabel(activeStatus)})` : ' — NOT YET EXECUTED'}
                </span>

                {!activeOutput ? (
                  <div style={{ padding: '20px 24px', background: '#181815', border: '1px solid #2A2926', borderRadius: 4 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F2EA', marginBottom: 6 }}>No output available yet</p>
                    <p style={{ fontSize: 14, color: '#8C8981', marginBottom: 14, lineHeight: 1.65 }}>
                      This agent has not been executed for the selected investigation.
                      Run an AI Investigation from the Threat Intelligence page.
                    </p>
                    <button className="btn-primary" onClick={() => navigate('/threats')} style={{ fontSize: 13 }}>
                      Run AI Investigation <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#181815', border: '1px solid #2A2926', padding: '16px 20px', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Tab 1 output */}
                    {activeTab === 1 && analysis && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: '#11110F', padding: '10px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', flexWrap: 'wrap' }}>
                          <span>Threat Type: <strong style={{ color: '#F5F2EA' }}>{analysis.threatType}</strong></span>
                          <span>Confidence: <strong style={{ color: '#F5F2EA' }}>{Math.round(analysis.confidence * 100)}%</strong></span>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Assessment</span>
                          <p style={{ fontSize: 14, color: '#F5F2EA', margin: 0, lineHeight: 1.7 }}>{analysis.assessment}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Technical Reasoning</span>
                          <p style={{ fontSize: 13, color: '#8C8981', margin: 0, lineHeight: 1.7 }}>{analysis.reasoning}</p>
                        </div>
                        {analysis.uncertainties && analysis.uncertainties.length > 0 && (
                          <div>
                            <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Uncertainties</span>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#8C8981', lineHeight: 1.7 }}>
                              {analysis.uncertainties.map((u, i) => <li key={i}>{u}</li>)}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    {/* Tab 2 output */}
                    {activeTab === 2 && summary && (
                      <>
                        <h4 style={{ fontSize: 17, fontWeight: 700, color: '#F5F2EA', margin: 0 }}>{summary.incidentTitle}</h4>
                        <p style={{ fontSize: 14, color: '#8C8981', margin: 0, lineHeight: 1.7 }}>{summary.executiveSummary}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#11110F', padding: '10px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                          <div><span style={{ color: '#6B6860' }}>TARGET: </span><span style={{ color: '#F5F2EA' }}>{summary.target}</span></div>
                          <div><span style={{ color: '#6B6860' }}>SOURCE: </span><span style={{ color: '#F5F2EA' }}>{summary.source}</span></div>
                        </div>
                      </>
                    )}

                    {/* Tab 3 output */}
                    {activeTab === 3 && riskAssessment && selectedThreat && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ background: '#11110F', border: '1px solid #2A2926', padding: '14px 16px', borderRadius: 4 }}>
                            <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Detection Score</span>
                            <span style={{ fontSize: 26, fontWeight: 700, color: '#F5F2EA', fontFamily: 'JetBrains Mono, monospace' }}>
                              {selectedThreat.riskScore}<span style={{ fontSize: 14, color: '#6B6860', fontWeight: 400 }}>/100</span>
                            </span>
                            <span style={{ display: 'block', fontSize: 12, color: '#6B6860', marginTop: 4 }}>Deterministic engine</span>
                          </div>
                          <div style={{ background: '#11110F', border: '1px solid #2A2926', padding: '14px 16px', borderRadius: 4 }}>
                            <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Contextual Risk Score</span>
                            <span style={{ fontSize: 26, fontWeight: 700, color: '#F5F2EA', fontFamily: 'JetBrains Mono, monospace' }}>
                              {riskAssessment.riskScore}<span style={{ fontSize: 14, color: '#6B6860', fontWeight: 400 }}>/100</span>
                            </span>
                            <span style={{ display: 'block', fontSize: 12, color: '#6B6860', marginTop: 4 }}>AI risk calculation</span>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, background: '#11110F', padding: '10px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                          {[
                            { label: 'LIKELIHOOD', value: riskAssessment.likelihood },
                            { label: 'IMPACT',     value: riskAssessment.impact },
                            { label: 'CRITICALITY',value: riskAssessment.targetCriticality },
                            { label: 'EVIDENCE',   value: riskAssessment.evidenceStrength },
                          ].map((item) => (
                            <div key={item.label}>
                              <span style={{ color: '#6B6860', display: 'block', fontSize: 10, marginBottom: 3 }}>{item.label}</span>
                              <strong style={{ color: '#F5F2EA' }}>{item.value}</strong>
                            </div>
                          ))}
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Rationale</span>
                          <p style={{ fontSize: 13, color: '#8C8981', margin: 0, lineHeight: 1.7 }}>{riskAssessment.rationale}</p>
                        </div>
                      </>
                    )}

                    {/* Tab 4 output */}
                    {activeTab === 4 && recommendation && (
                      <>
                        <div style={{ background: '#11110F', border: '1px solid #2A2926', padding: '10px 16px', borderRadius: 4, fontSize: 13, fontWeight: 700, color: '#F5F2EA', fontFamily: 'JetBrains Mono, monospace' }}>
                          AI ADVISORY — HUMAN REVIEW REQUIRED: YES
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>Overall Strategy</span>
                          <p style={{ fontSize: 14, color: '#F5F2EA', margin: 0, lineHeight: 1.7 }}>{recommendation.overallRecommendation}</p>
                        </div>
                        {recommendation.immediateActions && recommendation.immediateActions.length > 0 && (
                          <div>
                            <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 700 }}>
                              Immediate Actions
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {recommendation.immediateActions.slice(0, 3).map((item, idx) => (
                                <div key={idx} style={{ background: '#11110F', padding: '10px 14px', borderRadius: 4, border: '1px solid #1F1E1B' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span className="badge badge-accent" style={{ fontSize: 10 }}>{item.priority}</span>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F2EA' }}>{item.action}</span>
                                  </div>
                                  <p style={{ fontSize: 13, color: '#8C8981', margin: 0 }}>{item.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right metadata panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <span className="section-label" style={{ display: 'block', marginBottom: 14 }}>AGENT STATUS</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {AGENTS.map((agent) => {
                    const status = getAgentStatus(agent.key);
                    const color  = stageColor(status);
                    const isThis = agent.id === activeTab;
                    return (
                      <button
                        key={agent.id}
                        onClick={() => handleTabChange(agent.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isThis ? '#181815' : 'none',
                          border: `1px solid ${isThis ? '#3f3e3a' : 'transparent'}`,
                          borderRadius: 4,
                          padding: '8px 10px',
                          cursor: 'pointer',
                          gap: 8,
                          width: '100%',
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: 11, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', display: 'block' }}>{agent.label}</span>
                          <span style={{ fontSize: 13, fontWeight: isThis ? 700 : 500, color: '#F5F2EA' }}>{agent.name}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                          {stageLabel(status).replace('○ ', '').replace('● ', '').replace('✓ ', '').replace('! ', '')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ padding: 20 }}>
                <span className="section-label" style={{ display: 'block', marginBottom: 14 }}>METADATA</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 11, color: '#6B6860', marginBottom: 2 }}>MODEL</span>
                    <span style={{ color: '#F5F2EA', fontWeight: 600 }}>Google Gemini</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 11, color: '#6B6860', marginBottom: 2 }}>PERSISTENCE</span>
                    <span style={{ color: '#F5F2EA', fontWeight: 600 }}>Neon PostgreSQL</span>
                  </div>
                  {selectedThreat && (
                    <div style={{ borderTop: '1px solid #1F1E1B', paddingTop: 12 }}>
                      <span style={{ display: 'block', fontSize: 11, color: '#6B6860', marginBottom: 4 }}>SELECTED THREAT</span>
                      <span style={{ color: '#F5F2EA', fontWeight: 600, fontSize: 13, display: 'block', lineHeight: 1.4 }}>{selectedThreat.title}</span>
                      <span style={{ color: '#6B6860', fontSize: 11, display: 'block', marginTop: 2 }}>
                        ID: {selectedThreat.id.substring(0, 10)}…
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
