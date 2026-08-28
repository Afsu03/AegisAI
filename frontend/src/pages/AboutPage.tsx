import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Target, Layers, ArrowRight } from 'lucide-react';

const AGENTS = [
  { num: 'AGENT 01', name: 'Threat Analysis',         desc: 'Explains what is happening, using evidence reasoning and threat indicators.', nav: 1 },
  { num: 'AGENT 02', name: 'Incident Summary',         desc: 'Converts technical analysis into a concise, SOC-readable executive summary.', nav: 2 },
  { num: 'AGENT 03', name: 'Risk Assessment',          desc: 'Evaluates likelihood, impact, criticality, and computes a contextual risk score.', nav: 3 },
  { num: 'AGENT 04', name: 'Response Recommendation',  desc: 'Formulates structured human-reviewed response guidance across 5 categories.', nav: 4 },
];

const LOG_TYPES = [
  'Authentication Logs',
  'Web Application Logs',
  'Server Telemetry',
  'Firewall Logs',
  'IDS / IPS Events',
  'Network Device Logs',
];

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 64, maxWidth: 860 }}>

      {/* Header */}
      <div style={{ paddingBottom: 24, borderBottom: '1px solid #2A2926' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Shield size={22} color="#F5F2EA" />
          <p style={{ fontSize: 12, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Platform Information
          </p>
        </div>
        <h1 className="page-title" style={{ marginBottom: 10 }}>About AegisAI</h1>
        <p className="page-description" style={{ maxWidth: 680 }}>
          AegisAI is a security intelligence platform that transforms raw security logs into structured
          threat intelligence using deterministic detection and a four-stage multi-agent LLM investigation pipeline.
        </p>
      </div>

      {/* What is AegisAI */}
      <div className="card" style={{ padding: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F2EA', marginBottom: 14, letterSpacing: '-0.01em' }}>
          What is AegisAI?
        </h2>
        <p style={{ fontSize: 15, color: '#8C8981', lineHeight: 1.75, marginBottom: 16 }}>
          AegisAI is an evidence-driven security log intelligence platform designed to work with heterogeneous
          security telemetry sources. It converts raw log data into structured threat events and processes them
          through a sequential 4-agent LLM reasoning pipeline to provide explainable, human-reviewed incident
          response guidance.
        </p>
        <p style={{ fontSize: 15, color: '#8C8981', lineHeight: 1.75, margin: 0 }}>
          <strong style={{ color: '#F5F2EA' }}>How it works:</strong> Upload logs → Parse & detect threats →
          AI agents investigate → Analyst reviews guidance → Take action.
        </p>
      </div>

      {/* Detection vs AI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Target size={18} color="#F5F2EA" />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F5F2EA', margin: 0 }}>Deterministic Detection</h3>
          </div>
          <p style={{ fontSize: 14, color: '#8C8981', lineHeight: 1.75, marginBottom: 14, margin: 0 }}>
            Rules-based threat detection runs first. No AI is involved at this stage.
            Patterns like brute force, privileged escalation, and impossible travel are identified using
            algorithmic rules. This produces a <strong style={{ color: '#F5F2EA' }}>Detection Score (0–100)</strong>.
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Layers size={18} color="#F5F2EA" />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F5F2EA', margin: 0 }}>AI Investigation Pipeline</h3>
          </div>
          <p style={{ fontSize: 14, color: '#8C8981', lineHeight: 1.75, margin: 0 }}>
            After detection, four specialized AI agents reason about the threat sequentially.
            Agent 03 calculates a separate <strong style={{ color: '#F5F2EA' }}>Contextual Risk Score (0–100)</strong> based on
            likelihood, impact, and evidence strength. Both scores are always shown separately.
          </p>
        </div>
      </div>

      {/* 4 Agents */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F2EA', letterSpacing: '-0.01em' }}>
            The 4-Agent LLM Pipeline
          </h2>
          <button className="btn-ghost" onClick={() => navigate('/agents')} style={{ fontSize: 13 }}>
            Inspect in Agent Lab <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {AGENTS.map((ag) => (
            <div
              key={ag.num}
              className="card"
              style={{
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => navigate(`/agents?agent=${ag.nav}`)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3f3e3a')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2926')}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6 }}>
                {ag.num}
              </span>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#F5F2EA', margin: '0 0 8px' }}>{ag.name}</h4>
              <p style={{ fontSize: 13, color: '#8C8981', margin: 0, lineHeight: 1.65 }}>{ag.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Log sources */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F2EA', marginBottom: 14, letterSpacing: '-0.01em' }}>
          Supported Log Types
        </h2>
        <p style={{ fontSize: 14, color: '#8C8981', lineHeight: 1.75, marginBottom: 16 }}>
          AegisAI is designed to ingest and analyze a broad range of security telemetry sources.
          The current demonstration uses authentication logs.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {LOG_TYPES.map((type) => (
            <div
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: '#181815',
                border: '1px solid #2A2926',
                borderRadius: 4,
                fontSize: 14,
                color: '#8C8981',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B6860', flexShrink: 0 }} />
              {type}
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: '#11110F', border: '1px solid #2A2926', borderRadius: 4, padding: '16px 20px' }}>
        <p style={{ fontSize: 14, color: '#6B6860', margin: 0, lineHeight: 1.75, fontFamily: 'JetBrains Mono, monospace' }}>
          ALL AI OUTPUTS ARE ADVISORY ONLY AND REQUIRE HUMAN REVIEW BEFORE TAKING OPERATIONAL ACTION.
          AEGISAI TAKES NO AUTONOMOUS SECURITY ACTIONS.
        </p>
      </div>

    </div>
  );
};
