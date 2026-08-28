import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ArrowDown, ShieldCheck, ArrowRight } from 'lucide-react';

const PIPE_STAGES = [
  {
    num: '01',
    title: 'Log Ingestion',
    sub: 'Security Telemetry Sources',
    desc: 'Uploads security log files (CSV, JSON, LOG, TXT) containing firewall telemetry, authentication records, server logs, and network events. Supported via drag-and-drop or file picker.',
  },
  {
    num: '02',
    title: 'Preprocessing',
    sub: 'Normalization & Database Persistence',
    desc: 'Parses raw log files, normalizes schema fields into structured LogRecord instances, and stores them in a Neon PostgreSQL database using Prisma ORM.',
  },
  {
    num: '03',
    title: 'Threat Detection',
    sub: 'Rule-Based Deterministic Engine',
    desc: 'Analyzes structured log records against deterministic rules: Brute Force (failed login thresholds), Privileged Activity (escalation), and Impossible Travel (geographic speed calculation).',
  },
  {
    num: '04',
    title: 'Threat Event',
    sub: 'Correlated Input Record for AI Pipeline',
    desc: 'Constructs a structured ThreatEvent with a deterministic detection score (0–100) and correlated log references. This becomes the formal input to the multi-agent reasoning layer.',
  },
];

const AGENTS = [
  {
    id: 1,
    label: 'AGENT 01',
    name: 'Threat Analysis',
    purpose: 'Determines what suspicious activity is occurring, explains the evidence, assesses potential impact, and identifies uncertainties.',
    input: 'ThreatEvent + evidence',
    output: 'ThreatAnalysis',
  },
  {
    id: 2,
    label: 'AGENT 02',
    name: 'Incident Summary',
    purpose: 'Converts technical threat analysis into a concise, analyst-readable SOC incident summary including executive summary, timeline, target, and source.',
    input: 'ThreatAnalysis',
    output: 'IncidentSummary',
  },
  {
    id: 3,
    label: 'AGENT 03',
    name: 'Risk Assessment',
    purpose: 'Evaluates likelihood, impact, target criticality, and evidence strength. The backend deterministically calculates the contextual risk score (0–100) and assigns priority (P1–P4).',
    input: 'ThreatAnalysis + IncidentSummary',
    output: 'RiskAssessment',
  },
  {
    id: 4,
    label: 'AGENT 04',
    name: 'Response Recommendation',
    purpose: 'Generates evidence-based incident response recommendations across 5 structured categories for human security analyst review. Advisory only.',
    input: 'ThreatAnalysis + IncidentSummary + RiskAssessment',
    output: 'ResponseRecommendation',
  },
];

export const ArchitecturePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 36, paddingBottom: 64, maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ paddingBottom: 24, borderBottom: '1px solid #2A2926' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Network size={22} color="#F5F2EA" />
          <p style={{ fontSize: 12, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Technical Reference
          </p>
        </div>
        <h1 className="page-title" style={{ marginBottom: 10 }}>System Architecture</h1>
        <p className="page-description">
          Evidence-driven security analysis through deterministic threat detection and a sequential 4-agent LLM reasoning pipeline.
        </p>
      </div>

      {/* Pipeline diagram */}
      <div>
        <span className="section-label" style={{ display: 'block', marginBottom: 20 }}>INGESTION → DETECTION → AI REASONING → HUMAN REVIEW</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

          {/* Stages 01–04 */}
          {PIPE_STAGES.map((stage) => (
            <React.Fragment key={stage.num}>
              <div
                style={{
                  width: '100%',
                  background: '#11110F',
                  border: '1px solid #2A2926',
                  borderRadius: 4,
                  padding: '20px 24px',
                  display: 'flex',
                  gap: 20,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    background: '#0A0A0A',
                    border: '1px solid #2A2926',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#F5F2EA',
                  }}
                >
                  {stage.num}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F5F2EA', margin: 0 }}>{stage.title}</h3>
                    <span className="section-label" style={{ color: '#8C8981' }}>{stage.sub}</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#8C8981', margin: 0, lineHeight: 1.7 }}>{stage.desc}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
                <ArrowDown size={16} color="#6B6860" />
              </div>
            </React.Fragment>
          ))}

          {/* 05 Multi-agent layer */}
          <div
            style={{
              width: '100%',
              background: '#181815',
              border: '1px solid #2A2926',
              borderRadius: 4,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={{ borderBottom: '1px solid #2A2926', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#F5F2EA' }}>Multi-Agent Intelligence Layer</span>
                <span className="section-label" style={{ color: '#8C8981' }}>05 — Sequential LLM Reasoning</span>
              </div>
              <p style={{ fontSize: 14, color: '#8C8981', margin: 0, lineHeight: 1.7 }}>
                Four specialized AI agents process threats sequentially. Each agent's output feeds the next stage.
              </p>
            </div>

            {AGENTS.map((ag, idx) => (
              <React.Fragment key={ag.id}>
                <div
                  style={{
                    background: '#11110F',
                    border: '1px solid #2A2926',
                    borderRadius: 4,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                        {ag.label}
                      </span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#F5F2EA', margin: 0 }}>
                        {ag.name}
                      </h4>
                    </div>
                    <button
                      onClick={() => navigate(`/agents?agent=${ag.id}`)}
                      className="btn-secondary"
                      style={{ fontSize: 13, padding: '6px 14px' }}
                    >
                      Inspect Agent <ArrowRight size={13} />
                    </button>
                  </div>

                  <p style={{ fontSize: 14, color: '#8C8981', margin: 0, lineHeight: 1.7 }}>{ag.purpose}</p>

                  <div
                    style={{
                      display: 'flex',
                      gap: 24,
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      background: '#0A0A0A',
                      padding: '8px 14px',
                      borderRadius: 3,
                      border: '1px solid #1F1E1B',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div><span style={{ color: '#6B6860' }}>INPUT: </span><span style={{ color: '#8C8981' }}>{ag.input}</span></div>
                    <div><span style={{ color: '#6B6860' }}>OUTPUT: </span><span style={{ color: '#F5F2EA' }}>{ag.output}</span></div>
                  </div>
                </div>

                {idx < AGENTS.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 16 }}>
                    <ArrowDown size={14} color="#6B6860" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
            <ArrowDown size={16} color="#6B6860" />
          </div>

          {/* 06 Human review */}
          <div
            style={{
              width: '100%',
              background: '#11110F',
              border: '1px solid #2A2926',
              borderRadius: 4,
              padding: '20px 24px',
              display: 'flex',
              gap: 20,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                background: '#0A0A0A',
                border: '1px solid #2A2926',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} color="#F5F2EA" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F5F2EA', margin: 0 }}>Human Review & Response</h3>
                <span className="section-label" style={{ color: '#8C8981' }}>06 — SOC Decision Support</span>
              </div>
              <p style={{ fontSize: 14, color: '#8C8981', margin: 0, lineHeight: 1.7 }}>
                Human security analyst evaluates all AI-generated intelligence before taking any operational response action.
                All AI output is advisory only. AegisAI takes no autonomous action.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
