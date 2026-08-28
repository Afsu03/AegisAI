import React, { useCallback, useState } from 'react';
import { Upload, FileCheck, AlertCircle, X } from 'lucide-react';

const ALLOWED_EXTS = ['.csv', '.json', '.jsonl', '.ndjson', '.log', '.txt', '.xlsx', '.xls', '.xml'];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtension(name: string) {
  return name.slice(name.lastIndexOf('.')).toLowerCase();
}

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileAccepted, disabled }) => {
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    const ext = getExtension(file.name);
    if (!ALLOWED_EXTS.includes(ext))
      return `Unsupported file format "${ext}". Supported security log formats: CSV, JSON, JSONL, LOG, TXT, XLSX, XML`;
    if (file.size > MAX_BYTES)
      return `File too large (${formatBytes(file.size)}). Maximum size is 50 MB.`;
    return null;
  };

  const accept = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) { setError(err); setStaged(null); return; }
      setError(null);
      setStaged(file);
      onFileAccepted(file);
    },
    [onFileAccepted]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) accept(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) accept(file);
    e.target.value = '';
  };

  const clear = () => { setStaged(null); setError(null); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Drop area */}
      <label
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '40px 24px',
          borderRadius: 6,
          border: `1px dashed ${error ? '#D97979' : dragging ? '#F5F2EA' : '#2A2926'}`,
          background: dragging ? '#181815' : '#0A0A0A',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          opacity: disabled ? 0.5 : 1,
          textAlign: 'center',
        }}
      >
        <input
          type="file"
          accept=".csv,.json,.jsonl,.ndjson,.log,.txt,.xlsx,.xls,.xml"
          onChange={onInputChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 4,
            background: dragging ? '#22221F' : '#11110F',
            border: `1px solid ${dragging ? '#3f3e3a' : '#2A2926'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Upload size={22} color={dragging ? '#F5F2EA' : '#8C8981'} />
        </div>
        <div>
          <p style={{ color: '#F5F2EA', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>
            {dragging ? 'Drop log file to upload' : 'Click to browse or drop file here'}
          </p>
          <p style={{ color: '#6B6860', fontSize: 12, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
            SUPPORTED FORMATS: CSV · JSON · JSONL · LOG · TXT · XLSX · XML (MAX 50MB)
          </p>
        </div>
      </label>

      {/* Validation error */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 6,
          }}
        >
          <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#FCA5A5', flex: 1 }}>{error}</p>
          <button
            onClick={clear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717A', display: 'flex' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Staged file preview */}
      {staged && !error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(0,217,255,0.04)',
            border: '1px solid rgba(0,217,255,0.2)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileCheck size={15} color="#00D9FF" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{staged.name}</p>
              <p style={{ fontSize: 11, color: '#71717A', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatBytes(staged.size)} &nbsp;·&nbsp; {getExtension(staged.name).slice(1).toUpperCase()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={clear}
              className="btn-secondary"
              style={{ fontSize: 12, padding: '6px 12px' }}
              disabled={disabled}
            >
              <X size={12} /> Remove
            </button>
            <button
              onClick={() => onFileAccepted(staged)}
              className="btn-primary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              disabled={disabled}
            >
              Upload File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
