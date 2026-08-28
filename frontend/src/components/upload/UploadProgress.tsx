import React from 'react';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import type { UploadResult } from '../../types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type UploadPhase = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadProgressProps {
  phase:     UploadPhase;
  progress:  number;          // 0-100 during uploading
  fileName?: string;
  error?:    string;
  result?:   UploadResult;
  onDismiss?: () => void;     // reset to idle
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  phase,
  progress,
  fileName,
  error,
  result,
  onDismiss,
}) => {
  if (phase === 'idle') return null;

  // ── Success ────────────────────────────────────────────────────────────
  if (phase === 'success' && result) {
    const f = result.file;
    const s = result.summary;
    return (
      <div
        className="fade-in"
        style={{
          background: 'rgba(34,197,94,0.05)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 8,
          padding: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} color="#22C55E" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#22C55E' }}>
              Upload Successful
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="btn-secondary"
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Upload Another
            </button>
          )}
        </div>

        {/* Metadata grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          {[
            { label: 'File Name',    value: f.originalName, mono: false },
            { label: 'File Size',    value: formatBytes(f.fileSize), mono: true },
            { label: 'Upload Time',  value: new Date(f.uploadedAt).toLocaleString(), mono: false },
            { label: 'Log Type',     value: s.logType, mono: true },
            { label: 'Total Lines',  value: s.totalLines.toLocaleString(), mono: true },
            { label: 'Parsed Records', value: s.parsedRecords.toLocaleString(), mono: true },
            { label: 'Parse Errors', value: s.errorCount.toLocaleString(), mono: true },
            { label: 'Status',       value: f.status, mono: true },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                background: '#0f0f0f',
                border: '1px solid #1c1c1c',
                borderRadius: 6,
                padding: '10px 14px',
              }}
            >
              <p className="section-label" style={{ marginBottom: 4 }}>{row.label}</p>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  fontFamily: row.mono ? 'JetBrains Mono, monospace' : 'inherit',
                  wordBreak: 'break-all',
                }}
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div
        style={{
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 8,
          padding: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <XCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#FCA5A5', marginBottom: 4 }}>
            Upload Failed
          </p>
          <p style={{ fontSize: 12, color: '#71717A' }}>
            {error ?? 'An unknown error occurred.'}
          </p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}>
            Retry
          </button>
        )}
      </div>
    );
  }

  // ── Uploading / Processing ─────────────────────────────────────────────
  const isUploading   = phase === 'uploading';
  const isProcessing  = phase === 'processing';
  const displayLabel  = isUploading ? `Uploading${fileName ? ` "${fileName}"` : ''}…` : 'Parsing log records…';
  const pct           = isUploading ? progress : 100;

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #262626',
        borderRadius: 8,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        {isUploading ? (
          <FileText size={15} color="#00D9FF" />
        ) : (
          <Loader2 size={15} color="#00D9FF" style={{ animation: 'spin 1s linear infinite' }} />
        )}
        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{displayLabel}</p>
        {isUploading && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#00D9FF',
              fontWeight: 600,
            }}
          >
            {pct}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: isProcessing ? '100%' : `${pct}%`,
            animation: isProcessing ? 'indeterminate 1.5s ease-in-out infinite' : undefined,
          }}
        />
      </div>

      {isProcessing && (
        <p style={{ fontSize: 11, color: '#52525B', marginTop: 8, fontFamily: 'JetBrains Mono, monospace' }}>
          Detecting log format · Parsing records · Writing to database…
        </p>
      )}
    </div>
  );
};
