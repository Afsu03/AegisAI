import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, CheckCircle, Loader2, FileCode, ArrowRight, X } from 'lucide-react';
import { DropZone } from '../components/upload/DropZone';
import { uploadLogFile, analyzeLogFile } from '../lib/api';
import type { UploadResult } from '../types';

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PIPELINE_STAGES = [
  { num: '01', label: 'UPLOAD',           desc: 'Log file received and transferred to backend' },
  { num: '02', label: 'PARSE',            desc: 'Records extracted and stored in database' },
  { num: '03', label: 'DETECT',           desc: 'Deterministic threat detection rules applied' },
  { num: '04', label: 'AI INVESTIGATION', desc: 'Threat Analysis → Incident Summary → Risk → Response' },
  { num: '05', label: 'COMPLETE',         desc: 'Human analyst review and action' },
];

export const NewAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [file,           setFile]           = useState<File | null>(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error,          setError]          = useState<string | null>(null);
  const [result,         setResult]         = useState<UploadResult | null>(null);

  // Determine active stage from upload state
  const activeStageIndex = (() => {
    if (result)    return 4; // complete
    if (uploading) return 1; // uploading
    if (file)      return 0; // file selected
    return -1;
  })();

  const handleFileAccepted = (acceptedFile: File) => {
    setFile(acceptedFile);
    setError(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    setUploadProgress(0);
  };

  const handleStartAnalysis = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const res = await uploadLogFile(file, (p: number) => setUploadProgress(p));
      // Run deterministic threat detection immediately on the uploaded file
      if (res.file?.id) {
        try {
          await analyzeLogFile(res.file.id);
        } catch (detectErr) {
          console.warn('Detection analysis notice:', detectErr);
        }
      }
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 64, maxWidth: 820, margin: '0 auto' }}>

      {/* Back button */}
      <div>
        <button onClick={() => navigate('/analyses')} className="btn-ghost" style={{ padding: 0, marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back to Analyses
        </button>

        <p style={{ fontSize: 12, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Start Investigation
        </p>
        <h1 className="page-title" style={{ marginBottom: 10 }}>New Analysis</h1>
        <p className="page-description">
          Upload one or more security log files to begin a multi-agent investigation.
          Supported security log formats: CSV, JSON, JSONL, LOG, TXT, XLSX, XML.
        </p>
      </div>

      {/* Upload card */}
      {!result ? (
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Drop zone */}
          {!file && (
            <DropZone onFileAccepted={handleFileAccepted} disabled={uploading} />
          )}

          {/* Selected file preview */}
          {file && (
            <div
              style={{
                background: '#181815',
                border: '1px solid #2A2926',
                borderRadius: 4,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: '#0A0A0A',
                  border: '1px solid #2A2926',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileCode size={22} color="#8C8981" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F2EA', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#8C8981', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span style={{ padding: '1px 6px', background: '#11110F', border: '1px solid #2A2926', borderRadius: 2 }}>
                    {file.name.split('.').pop()?.toUpperCase() ?? 'LOG'}
                  </span>
                  <span>{formatBytes(file.size)}</span>
                  {uploading && (
                    <>
                      <span>·</span>
                      <span style={{ color: '#D9B679' }}>Uploading {uploadProgress}%…</span>
                    </>
                  )}
                </div>

                {/* Progress bar */}
                {uploading && (
                  <div
                    style={{
                      marginTop: 10,
                      height: 3,
                      background: '#2A2926',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${uploadProgress}%`,
                        background: '#F5F2EA',
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>

              {!uploading && (
                <button
                  onClick={handleRemoveFile}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6B6860',
                    cursor: 'pointer',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 4,
                    flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F5F2EA')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6860')}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'rgba(217,121,121,0.08)',
                border: '1px solid rgba(217,121,121,0.2)',
                padding: '12px 16px',
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 14, color: '#D97979', fontWeight: 600, marginBottom: 2, display: 'block' }}>Upload Failed</span>
              <p style={{ fontSize: 13, color: '#8C8981', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          {file && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 13, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                AI-generated results are advisory only and require human review.
              </p>
              <button
                className="btn-primary"
                onClick={handleStartAnalysis}
                disabled={uploading}
                style={{ fontSize: 14, padding: '10px 24px' }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    Processing…
                  </>
                ) : (
                  <>
                    Start Analysis <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Pipeline stages */}
          <div style={{ borderTop: '1px solid #1F1E1B', paddingTop: 24 }}>
            <span className="section-label" style={{ display: 'block', marginBottom: 16 }}>
              INVESTIGATION PIPELINE
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PIPELINE_STAGES.map((s, idx) => {
                const isActive = idx === activeStageIndex;
                const isDone   = idx < activeStageIndex || (result && idx === 4);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      borderRadius: 4,
                      border: `1px solid ${isActive ? '#3f3e3a' : '#2A2926'}`,
                      background: isActive ? '#181815' : '#0A0A0A',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: isDone ? '#F5F2EA' : isActive ? '#D9B679' : '#6B6860',
                        minWidth: 24,
                      }}
                    >
                      {isDone ? '✓' : s.num}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: isDone || isActive ? '#F5F2EA' : '#8C8981',
                          display: 'block',
                          marginBottom: 2,
                        }}
                      >
                        {s.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                        {s.desc}
                      </span>
                    </div>
                    {isActive && uploading && (
                      <Loader2 size={14} color="#D9B679" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Success state */
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              background: 'rgba(245, 242, 234, 0.04)',
              border: '1px solid #2A2926',
              padding: '24px',
              borderRadius: 6,
            }}
          >
            <CheckCircle size={28} color="#F5F2EA" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F5F2EA', marginBottom: 6 }}>
                Log Ingestion & Normalization Complete
              </h3>
              <p style={{ fontSize: 14, color: '#8C8981', lineHeight: 1.6, marginBottom: 16 }}>
                Your security log was parsed, normalized, and evaluated by the deterministic detection engine.
              </p>

              {/* Ingested File Details Card */}
              <div
                style={{
                  background: '#0A0A0A',
                  border: '1px solid #1F1E1B',
                  borderRadius: 4,
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 14,
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block' }}>Filename</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F2EA', wordBreak: 'break-all' }}>
                    {result.file?.originalName ?? file?.name ?? '—'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block' }}>Format · Size</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F2EA' }}>
                    {result.summary?.logType ?? result.file?.logType ?? 'LOG'} · {formatBytes(result.file?.fileSize ?? file?.size ?? 0)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block' }}>Status</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F2EA' }}>
                    ✓ {result.file?.status ?? 'READY'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#6B6860', textTransform: 'uppercase', display: 'block' }}>Records Parsed</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F5F2EA', fontFamily: 'JetBrains Mono, monospace' }}>
                    {(result.summary?.parsedRecords ?? result.file?.parsedRecords ?? 0).toLocaleString()}
                  </span>
                </div>
                {result.summary?.errorCount !== undefined && result.summary.errorCount > 0 && (
                  <div>
                    <span style={{ fontSize: 11, color: '#D97979', textTransform: 'uppercase', display: 'block' }}>Parsing Errors</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#D97979', fontFamily: 'JetBrains Mono, monospace' }}>
                      {result.summary.errorCount} line(s) skipped
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              className="btn-secondary"
              onClick={() => { setResult(null); setFile(null); setUploadProgress(0); }}
              style={{ fontSize: 13 }}
            >
              <Upload size={14} /> Upload Another File
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (result.file?.id) {
                  navigate(`/threats?fileId=${result.file.id}`);
                } else {
                  navigate('/threats');
                }
              }}
              style={{ fontSize: 13 }}
            >
              Open Investigation <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
