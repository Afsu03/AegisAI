import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCode, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import type { UploadResult, LogFile } from '../types';
import { uploadLogFile, getLogFiles, analyzeLogFile } from '../lib/api';
import { DropZone } from '../components/upload/DropZone';
import { UploadProgress, type UploadPhase } from '../components/upload/UploadProgress';
import { LogTable } from '../components/logs/LogTable';

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export const LogAnalysisPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedId = searchParams.get('fileId');

  // ── Upload state ─────────────────────────────────────────────────────────
  const [phase,     setPhase]    = useState<UploadPhase>('idle');
  const [progress,  setProgress] = useState(0);
  const [uploadErr, setUploadErr]= useState<string | null>(null);
  const [result,    setResult]   = useState<UploadResult | null>(null);
  const [fileName,  setFileName] = useState<string>('');

  // ── File list state ──────────────────────────────────────────────────────
  const [files,        setFiles]       = useState<LogFile[]>([]);
  const [selectedId,   setSelectedId]  = useState<string | null>(preselectedId);

  // ── Threat analysis state ────────────────────────────────────────────────
  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');
  const [eventsAnalyzed, setEventsAnalyzed] = useState(0);
  const [threatsDetected, setThreatsDetected] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const selectedFile = files.find((f) => f.id === selectedId) ?? null;

  useEffect(() => {
    setAnalysisState('idle');
    setEventsAnalyzed(0);
    setThreatsDetected(0);
    setAnalysisError(null);
  }, [selectedId]);

  // Load existing files on mount
  const refreshFiles = useCallback(async () => {
    try {
      const res = await getLogFiles(1, 100);
      setFiles(res.data);
    } catch { /* backend might be offline */ }
  }, []);

  useEffect(() => { refreshFiles(); }, [refreshFiles]);

  // Sync selected file from URL param
  useEffect(() => {
    if (preselectedId) setSelectedId(preselectedId);
  }, [preselectedId]);

  // ── Upload handler ───────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    setFileName(file.name);
    setPhase('uploading');
    setProgress(0);
    setUploadErr(null);
    setResult(null);

    try {
      const res = await uploadLogFile(file, (pct: number) => {
        setProgress(pct);
        if (pct === 100) setPhase('processing');
      });
      setResult(res);
      setPhase('success');
      // Add the new file to the list and select it
      setFiles((prev) => [res.file, ...prev.filter((f) => f.id !== res.file.id)]);
      setSelectedId(res.file.id);
      setSearchParams({ fileId: res.file.id }, { replace: true });
    } catch (err: any) {
      setUploadErr(err?.message ?? 'Upload failed.');
      setPhase('error');
    }
  };

  const resetUpload = () => {
    setPhase('idle');
    setProgress(0);
    setUploadErr(null);
    setResult(null);
    setFileName('');
  };

  const handleAnalyze = async () => {
    if (!selectedId) return;
    setAnalysisState('analyzing');
    setAnalysisError(null);
    try {
      const res = await analyzeLogFile(selectedId);
      setEventsAnalyzed(res.eventsAnalyzed);
      setThreatsDetected(res.threatsDetected);
      setAnalysisState('complete');
    } catch (err: any) {
      setAnalysisError(err?.message ?? 'Analysis failed.');
      setAnalysisState('error');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>

      {/* Header */}
      <div style={{ paddingBottom: 20, borderBottom: '1px solid #1c1c1c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileCode size={16} color="#00D9FF" />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            Log Ingestion &amp; Analysis
          </h1>
        </div>
        <p style={{ fontSize: 12, color: '#71717A', fontFamily: 'JetBrains Mono, monospace' }}>
          Upload security log files — CSV, JSON, LOG, TXT up to 50 MB
        </p>
      </div>

      {/* Upload panel */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Upload Log File</p>
          {files.length > 0 && (
            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
              {files.length} file{files.length !== 1 ? 's' : ''} uploaded
            </span>
          )}
        </div>

        {/* Only show dropzone when idle or ready to re-upload */}
        {(phase === 'idle') && (
          <DropZone onFileAccepted={handleUpload} />
        )}

        {/* Progress / result / error */}
        <UploadProgress
          phase={phase}
          progress={progress}
          fileName={fileName}
          error={uploadErr ?? undefined}
          result={result ?? undefined}
          onDismiss={resetUpload}
        />
      </div>

      {/* File selector — show when we have multiple files and no specific one is selected */}
      {files.length > 1 && !selectedFile && phase !== 'success' && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
            Select a file to view records
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelectedId(f.id); setSearchParams({ fileId: f.id }, { replace: true }); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#0f0f0f',
                  border: '1px solid #262626',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00D9FF33'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#262626'; }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                    {f.originalName}
                  </p>
                  <p style={{ fontSize: 11, color: '#52525B', fontFamily: 'JetBrains Mono, monospace' }}>
                    {f.logType} &nbsp;·&nbsp; {f.parsedRecords.toLocaleString()} records &nbsp;·&nbsp; {formatBytes(f.fileSize)}
                  </p>
                </div>
                <ChevronRight size={15} color="#52525B" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log record table */}
      {selectedFile && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* File info header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #1c1c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                {files.length > 1 && (
                  <button
                    onClick={() => { setSelectedId(null); setSearchParams({}, { replace: true }); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', display: 'flex', padding: 0 }}
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                  {selectedFile.originalName}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { k: 'Type',    v: selectedFile.logType },
                  { k: 'Records', v: selectedFile.parsedRecords.toLocaleString() },
                  { k: 'Size',    v: formatBytes(selectedFile.fileSize) },
                  { k: 'Errors',  v: selectedFile.errorCount.toLocaleString() },
                ].map(({ k, v }) => (
                  <span key={k} style={{ fontSize: 11, color: '#52525B' }}>
                    <span style={{ color: '#71717A' }}>{k}:</span>{' '}
                    <span style={{ color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {selectedFile.status === 'READY' && analysisState === 'idle' && (
                <button
                  className="btn-primary"
                  onClick={handleAnalyze}
                  style={{ fontSize: 11, padding: '6px 12px', height: 'fit-content' }}
                >
                  Analyze Logs
                </button>
              )}
              {analysisState === 'analyzing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#F59E0B' }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  Analyzing logs...
                </div>
              )}
              {analysisState === 'complete' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginRight: 8 }}>
                  <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>Analysis Complete</span>
                  <span style={{ fontSize: 10, color: '#A1A1AA' }}>
                    Events analyzed: {eventsAnalyzed}
                  </span>
                  <span style={{ fontSize: 10, color: '#FCA5A5' }}>
                    Threats detected: {threatsDetected}
                  </span>
                </div>
              )}
              {analysisState === 'error' && (
                <span style={{ fontSize: 11, color: '#EF4444', marginRight: 8 }}>Analysis Failed: {analysisError}</span>
              )}
              <span className="badge badge-success">READY</span>
            </div>
          </div>

          {/* The table */}
          <LogTable fileId={selectedFile.id} />
        </div>
      )}
    </div>
  );
};
