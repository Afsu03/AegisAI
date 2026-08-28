import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  ShieldAlert,
  FileSearch,
  Activity,
  Bot,
  BarChart2,
  Brain,
  ArrowDown,
} from 'lucide-react';

const features = [
  {
    icon: ShieldAlert,
    title: 'Threat Detection',
    desc: 'Deterministic rule-based engine detects brute force, privileged account anomalies, and impossible travel patterns in security logs.',
  },
  {
    icon: FileSearch,
    title: 'Security Log Analysis',
    desc: 'Upload authentication, server, and network logs (CSV, JSON, LOG, TXT) for structured parsing and threat correlation.',
  },
  {
    icon: Activity,
    title: 'Dual Scoring System',
    desc: 'Separate Detection Score (deterministic engine) and Contextual Risk Score (Agent 03 LLM) for transparent, interpretable risk output.',
  },
  {
    icon: Bot,
    title: 'Multi-Agent Pipeline',
    desc: 'Four sequential AI agents — Threat Analysis, Incident Summary, Risk Assessment, Response Recommendation — each with a defined role.',
  },
  {
    icon: Brain,
    title: 'Evidence-Based Reasoning',
    desc: 'Every AI output is grounded in correlated log evidence. No hallucinated threats — all findings trace back to uploaded telemetry.',
  },
  {
    icon: BarChart2,
    title: 'Human Review Required',
    desc: 'All AI-generated guidance is advisory. AegisAI surfaces intelligence for security analyst review, not autonomous blocking.',
  },
];

const pipeline = [
  { step: '01', label: 'Upload Security Logs' },
  { step: '02', label: 'Detect Threats' },
  { step: '03', label: 'Run AI Investigation' },
  { step: '04', label: 'Human Review' },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="app-bg" style={{ minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section
        className="fade-in"
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: '88px 24px 72px',
          textAlign: 'center',
        }}
      >
        {/* Status chip */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            background: '#11110F',
            border: '1px solid #2A2926',
            borderRadius: 4,
            marginBottom: 36,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#F5F2EA',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 500,
              color: '#8C8981',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            LLM-Augmented Multi-Agent Security Platform
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(42px, 8vw, 72px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#F5F2EA',
            lineHeight: 1.05,
            marginBottom: 20,
          }}
        >
          AEGISAI
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(15px, 2.5vw, 20px)',
            fontWeight: 500,
            color: '#C2BDB0',
            lineHeight: 1.5,
            maxWidth: 640,
            margin: '0 auto 16px',
          }}
        >
          Turn security logs into actionable intelligence.
        </p>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: '#8C8981',
            lineHeight: 1.75,
            maxWidth: 560,
            margin: '0 auto 44px',
          }}
        >
          Upload security logs, detect suspicious activity, understand threats through
          specialized AI agents, assess risk, and receive evidence-based response
          recommendations.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/analyses/new"
            className="btn-primary"
            style={{
              padding: '11px 24px',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Start an Analysis <ArrowRight size={14} />
          </Link>
          <Link
            to="/architecture"
            className="btn-secondary"
            style={{
              padding: '11px 24px',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Explore Architecture <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Pipeline Flow ── */}
      <section
        style={{
          borderTop: '1px solid #1F1E1B',
          borderBottom: '1px solid #1F1E1B',
          background: '#0D0D0B',
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: '0 auto',
            padding: '32px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            flexWrap: 'wrap',
          }}
        >
          {pipeline.map((p, i) => (
            <React.Fragment key={p.step}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '12px 20px',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#6B6860',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  {p.step}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#F5F2EA',
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.label}
                </span>
              </div>
              {i < pipeline.length - 1 && (
                <ArrowRight size={12} color="#3f3e3a" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section
        style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}
      >
        <div style={{ marginBottom: 36 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>
            Platform Capabilities
          </p>
          <h2
            style={{
              fontSize: 'clamp(20px, 3.5vw, 28px)',
              fontWeight: 700,
              color: '#F5F2EA',
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            Built for Security Operations
          </h2>
          <p style={{ fontSize: 13, color: '#8C8981', maxWidth: 460, lineHeight: 1.6 }}>
            AegisAI transforms raw security log telemetry into structured threat intelligence
            through deterministic detection and a multi-agent LLM reasoning pipeline.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 1,
            background: '#1F1E1B',
            border: '1px solid #1F1E1B',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                style={{
                  background: '#0D0D0B',
                  padding: '22px 20px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = '#11110F')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = '#0D0D0B')
                }
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    background: '#181815',
                    border: '1px solid #2A2926',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Icon size={14} color="#C2BDB0" />
                </div>
                <h3
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#F5F2EA',
                    marginBottom: 6,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {feat.title}
                </h3>
                <p style={{ fontSize: 11, color: '#6B6860', lineHeight: 1.65, margin: 0 }}>
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AI Agent Pipeline Summary ── */}
      <section
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <div
          style={{
            background: '#11110F',
            border: '1px solid #2A2926',
            borderRadius: 6,
            padding: 24,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>
              AI Investigation Pipeline
            </span>
            <p style={{ fontSize: 12, color: '#8C8981', margin: 0 }}>
              Four sequential AI agents, each with a specialized role in the investigation.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            {[
              {
                id: '01',
                name: 'Threat Analysis',
                q: 'What is happening?',
                desc: 'Interprets evidence, identifies threat type, explains technical indicators.',
              },
              {
                id: '02',
                name: 'Incident Summary',
                q: 'What happened?',
                desc: 'Converts technical analysis into a concise, analyst-readable SOC summary.',
              },
              {
                id: '03',
                name: 'Risk Assessment',
                q: 'How serious is it?',
                desc: 'Evaluates likelihood, impact, criticality. Backend calculates Contextual Risk Score.',
              },
              {
                id: '04',
                name: 'Response Recommendation',
                q: 'What should the analyst do?',
                desc: 'Generates structured, evidence-backed response guidance for human review.',
              },
            ].map((ag, idx, arr) => (
              <React.Fragment key={ag.id}>
                <div
                  style={{
                    width: '100%',
                    background: '#0A0A0A',
                    border: '1px solid #2A2926',
                    borderRadius: 4,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#6B6860',
                      fontFamily: 'JetBrains Mono, monospace',
                      flexShrink: 0,
                      minWidth: 24,
                    }}
                  >
                    {ag.id}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#F5F2EA',
                        }}
                      >
                        {ag.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#6B6860',
                          fontStyle: 'italic',
                        }}
                      >
                        "{ag.q}"
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: '#8C8981',
                        margin: '3px 0 0 0',
                        lineHeight: 1.5,
                      }}
                    >
                      {ag.desc}
                    </p>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 20,
                    }}
                  >
                    <ArrowDown size={12} color="#3f3e3a" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid #1F1E1B', paddingTop: 16 }}>
            <Link
              to="/analyses/new"
              className="btn-primary"
              style={{ fontSize: 11, padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Start an Analysis <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid #1F1E1B',
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} color="#F5F2EA" />
            <span style={{ fontSize: 12, color: '#F5F2EA', fontWeight: 600 }}>
              AegisAI Platform
            </span>
            <span style={{ fontSize: 12, color: '#6B6860' }}>
              — CS Final Year Project
            </span>
          </div>
          <p
            style={{
              fontSize: 10,
              color: '#6B6860',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            LLM-Augmented Multi-Agent Cyber Threat Intelligence &amp; Incident Response
          </p>
        </div>
      </footer>

    </div>
  );
};
