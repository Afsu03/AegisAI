import React from 'react';
import { Settings, Cpu, Shield, Key } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60, maxWidth: 700, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid #2A2926' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#F5F2EA', letterSpacing: '-0.01em', marginBottom: 2 }}>
          PLATFORM SETTINGS
        </h1>
        <p style={{ fontSize: 12, color: '#8C8981', fontFamily: 'JetBrains Mono, monospace' }}>
          AI model providers, API endpoints, and investigation parameters.
        </p>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Model config */}
        <div>
          <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>AI MODEL CONFIGURATION</span>
          <div style={{ background: '#181815', border: '1px solid #2A2926', padding: 14, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6860' }}>PRIMARY LLM PROVIDER</span>
              <span style={{ color: '#F5F2EA', fontWeight: 600 }}>Google Gemini</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6860' }}>CONFIGURED MODEL</span>
              <span style={{ color: '#F5F2EA', fontWeight: 600 }}>gemini-2.0-flash-lite / gemini-flash-latest</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6860' }}>PROMPT SCHEMA VERSION</span>
              <span style={{ color: '#F5F2EA', fontWeight: 600 }}>1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6860' }}>OUTPUT VALIDATION</span>
              <span style={{ color: '#F5F2EA', fontWeight: 600 }}>Strict Zod Schema Enforcement</span>
            </div>
          </div>
        </div>

        {/* Database & API */}
        <div>
          <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>BACKEND ARCHITECTURE</span>
          <div style={{ background: '#181815', border: '1px solid #2A2926', padding: 14, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6860' }}>REST API ENGINE</span>
              <span style={{ color: '#F5F2EA' }}>Node.js / Express</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6860' }}>DATABASE</span>
              <span style={{ color: '#F5F2EA' }}>Neon PostgreSQL (Serverless)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6860' }}>ORM CLIENT</span>
              <span style={{ color: '#F5F2EA' }}>Prisma ORM (PostgreSQL Adapter)</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
