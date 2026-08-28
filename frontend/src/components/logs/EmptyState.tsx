import React from 'react';
import { Upload, Database } from 'lucide-react';

interface EmptyStateProps {
  onUploadClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onUploadClick }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px',
      textAlign: 'center',
      gap: 20,
    }}
  >
    {/* Icon */}
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 16,
        background: '#111111',
        border: '1px solid #262626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Database size={28} color="#3f3f46" />
    </div>

    {/* Text */}
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
        No security logs uploaded
      </h2>
      <p style={{ fontSize: 13, color: '#71717A', maxWidth: 360, lineHeight: 1.6 }}>
        Upload a CSV, JSON, LOG, or TXT file to begin analysis.
      </p>
    </div>

    {/* CTA */}
    {onUploadClick && (
      <button
        className="btn-primary"
        onClick={onUploadClick}
        style={{ padding: '10px 24px', fontSize: 13 }}
      >
        <Upload size={14} />
        Upload Security Log
      </button>
    )}

    {/* Format hints */}
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
      {['CSV', 'JSON', 'LOG', 'TXT'].map((fmt) => (
        <span
          key={fmt}
          style={{
            padding: '3px 10px',
            background: '#111111',
            border: '1px solid #262626',
            borderRadius: 3,
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#52525B',
          }}
        >
          .{fmt.toLowerCase()}
        </span>
      ))}
    </div>
  </div>
);
