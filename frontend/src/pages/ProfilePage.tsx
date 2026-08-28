import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Calendar, Cpu, LogOut, CheckCircle2, Shield, Key,
  Loader2, AlertCircle, Trash2, RefreshCw, Lock, FileCode, Plus,
  ArrowRight, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAIProviderConfig, saveAIProviderConfig, removeAIProviderConfig,
  testAIProviderConnection, AIProviderStatus, getLogFiles, getThreats, deleteLogFile
} from '../lib/api';
import type { LogFile, ThreatEvent } from '../types';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // AI Provider config state
  const [providerConfig, setProviderConfig] = useState<AIProviderStatus | null>(null);
  const [loadingConfig,  setLoadingConfig]  = useState(true);
  const [isEditing,      setIsEditing]      = useState(false);
  const [apiKeyInput,    setApiKeyInput]    = useState('');
  const [saving,         setSaving]         = useState(false);
  const [testing,        setTesting]        = useState(false);
  const [testResult,     setTestResult]     = useState<{ success: boolean; message: string; model?: string } | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [successMsg,     setSuccessMsg]     = useState<string | null>(null);

  // User's files / analyses history state
  const [files,          setFiles]          = useState<LogFile[]>([]);
  const [threats,        setThreats]        = useState<ThreatEvent[]>([]);
  const [loadingFiles,   setLoadingFiles]   = useState(true);
  const [filesError,     setFilesError]     = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete,    setItemToDelete]    = useState<LogFile | null>(null);
  const [isDeletingFile,  setIsDeletingFile]  = useState(false);

  const loadProviderConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await getAIProviderConfig();
      if (res.success) {
        setProviderConfig(res);
      }
    } catch (e: any) {
      console.warn('Failed to load AI provider config:', e?.message);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const loadUserAnalyses = useCallback(async () => {
    setLoadingFiles(true);
    setFilesError(null);
    try {
      const [filesRes, threatsRes] = await Promise.all([
        getLogFiles(1, 100),
        getThreats(),
      ]);
      setFiles(filesRes.data);
      setThreats(threatsRes.data);
    } catch (e: any) {
      setFilesError(e?.message ?? 'Failed to load upload history.');
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadProviderConfig();
    loadUserAnalyses();
  }, [loadProviderConfig, loadUserAnalyses]);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput || apiKeyInput.trim().length < 8) {
      setError('Please enter a valid Gemini API key.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    setTestResult(null);

    try {
      const res = await saveAIProviderConfig(apiKeyInput.trim(), 'GEMINI');
      setProviderConfig({
        success: true,
        provider: res.provider,
        configured: true,
        maskedKey: res.maskedKey,
        enabled: true,
      });
      setApiKeyInput('');
      setIsEditing(false);
      setSuccessMsg('Gemini API key encrypted and saved successfully.');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save API key.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!window.confirm('Are you sure you want to remove your custom Gemini API key?')) return;
    setError(null);
    setSuccessMsg(null);
    setTestResult(null);
    try {
      await removeAIProviderConfig();
      setProviderConfig({
        success: true,
        provider: 'GEMINI',
        configured: false,
        maskedKey: null,
        enabled: false,
      });
      setSuccessMsg('Custom API key removed.');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to remove API key.');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await testAIProviderConnection(isEditing && apiKeyInput ? apiKeyInput.trim() : undefined);
      setTestResult({
        success: res.connected,
        message: res.message || (res.connected ? `Successfully connected (${res.model})` : 'Connection failed.'),
        model: res.model,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message ?? 'Failed to connect to Google Gemini API.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!itemToDelete) return;
    setIsDeletingFile(true);
    try {
      await deleteLogFile(itemToDelete.id);
      setFiles(prev => prev.filter(f => f.id !== itemToDelete.id));
      setThreats(prev => prev.filter(t => t.fileId !== itemToDelete.id));
      setItemToDelete(null);
      setDeleteModalOpen(false);
    } catch (err: any) {
      setFilesError(err?.message ?? 'Failed to delete file.');
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 64, maxWidth: 920, margin: '0 auto' }}>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Analysis?"
        itemName={itemToDelete?.originalName}
        message="This will permanently remove this analysis and its associated investigation data."
        isDeleting={isDeletingFile}
        onConfirm={handleDeleteFile}
        onCancel={() => {
          if (!isDeletingFile) {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }
        }}
      />
      
      {/* Header */}
      <div style={{ paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Account Settings
        </p>
        <h1 className="page-title" style={{ marginBottom: 10 }}>User Profile & Analysis History</h1>
        <p className="page-description">
          Manage your analyst account credentials, view uploaded log analyses, and configure your custom Google Gemini API key (BYOK).
        </p>
      </div>

      {/* Account Info Card */}
      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 6,
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={26} color="var(--text-primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {user?.name ?? 'Security Analyst'}
            </h2>
            <span className="badge badge-low" style={{ fontSize: 11 }}>
              AUTHENTICATED ANALYST
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            background: 'var(--bg)',
            padding: 16,
            borderRadius: 4,
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={16} color="var(--text-muted)" />
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Email</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email ?? '—'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="var(--text-muted)" />
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Member Since</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* MY ANALYSES & UPLOAD HISTORY SECTION                               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileCode size={20} color="var(--text-primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              My Analyses
            </h3>
            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={loadUserAnalyses}
              disabled={loadingFiles}
              style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={12} style={loadingFiles ? { animation: 'spin 1s linear infinite' } : undefined} />
              Refresh
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate('/analyses/new')}
              style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={13} />
              New Analysis
            </button>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Security log files uploaded by your account. Review investigation details or delete past analyses.
        </p>

        {/* Error */}
        {filesError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: 'rgba(217,121,121,0.08)',
              border: '1px solid rgba(217,121,121,0.2)',
              borderRadius: 4,
              fontSize: 13,
              color: '#D97979',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{filesError}</span>
          </div>
        )}

        {/* Loading */}
        {loadingFiles && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '24px 0' }}>
            <Loader2 size={16} color="var(--text-primary)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading your analyses…</span>
          </div>
        )}

        {/* Empty State */}
        {!loadingFiles && !filesError && files.length === 0 && (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px dashed var(--border)',
              borderRadius: 6,
              padding: '36px 20px',
              textAlign: 'center',
            }}
          >
            <FileCode size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              No analyses yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Upload a security log file to begin your first investigation.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate('/analyses/new')}
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Start New Analysis
            </button>
          </div>
        )}

        {/* Analyses List */}
        {!loadingFiles && !filesError && files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {files.map((f) => {
              const fileThreats = threats.filter((t) => t.fileId === f.id);
              const hasThreats = fileThreats.length > 0;
              const maxRisk = hasThreats ? Math.max(...fileThreats.map(t => t.riskScore)) : 0;
              const isBad = hasThreats || maxRisk >= 50;

              return (
                <div
                  key={f.id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {f.originalName}
                      </span>
                      {hasThreats ? (
                        <span className="badge badge-danger" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <ShieldAlert size={10} />
                          {fileThreats.length} THREAT{fileThreats.length > 1 ? 'S' : ''}
                        </span>
                      ) : (
                        <span className="badge badge-low" style={{ fontSize: 10, color: '#22C55E', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <ShieldCheck size={10} />
                          CLEAN
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      <span>{f.logType}</span>
                      <span>·</span>
                      <span>{formatBytes(f.fileSize)}</span>
                      <span>·</span>
                      <span>{f.parsedRecords.toLocaleString()} records</span>
                      <span>·</span>
                      <span>{timeAgo(f.uploadedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right', marginRight: 8 }}>
                      <span style={{ display: 'block', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        {isBad ? 'Threat Risk' : 'Health'}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: isBad ? '#EF4444' : '#22C55E', fontFamily: 'JetBrains Mono, monospace' }}>
                        {isBad ? maxRisk : 100}/100
                      </span>
                    </div>

                    <button
                      className="btn-secondary"
                      onClick={() => navigate(`/threats?fileId=${f.id}`)}
                      style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      Open <ArrowRight size={12} />
                    </button>

                    <button
                      onClick={() => {
                        setItemToDelete(f);
                        setDeleteModalOpen(true);
                      }}
                      title="Delete Analysis"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: 'var(--text-muted)',
                        padding: '6px 9px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        e.currentTarget.style.color = '#EF4444';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Provider & BYOK Section */}
      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={20} color="#D9B679" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              AI Intelligence Provider (BYOK)
            </h3>
          </div>
          {providerConfig?.configured ? (
            <span className="badge badge-success" style={{ fontSize: 11 }}>
              <CheckCircle2 size={12} /> CONNECTED (BYOK)
            </span>
          ) : (
            <span className="badge badge-medium" style={{ fontSize: 11 }}>
              SYSTEM FALLBACK
            </span>
          )}
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
          AegisAI uses Google Gemini to power the 4-stage sequential security investigation pipeline (Threat Analysis, Incident Summary, Risk Assessment, Response Recommendation).
        </p>

        {/* Status Alerts */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: 'rgba(217,121,121,0.08)',
              border: '1px solid rgba(217,121,121,0.2)',
              borderRadius: 4,
              fontSize: 13,
              color: '#D97979',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: 'rgba(245,242,234,0.06)',
              border: '1px solid rgba(245,242,234,0.15)',
              borderRadius: 4,
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            <CheckCircle2 size={16} color="var(--text-primary)" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {testResult && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: testResult.success ? 'rgba(245,242,234,0.06)' : 'rgba(217,121,121,0.08)',
              border: `1px solid ${testResult.success ? 'rgba(245,242,234,0.15)' : 'rgba(217,121,121,0.2)'}`,
              borderRadius: 4,
              fontSize: 13,
              color: testResult.success ? 'var(--text-primary)' : '#D97979',
            }}
          >
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Config Summary Card */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Provider</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Google Gemini</span>
          </div>

          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>API Key</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: providerConfig?.configured ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              {providerConfig?.maskedKey ?? 'Default System Key'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Encryption</span>
            <span style={{ fontSize: 12, color: '#D9B679', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={12} /> AES-256-GCM
            </span>
          </div>
        </div>

        {/* Key Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface-muted)', padding: 20, borderRadius: 4, border: '1px solid var(--border)' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
              Enter Google Gemini API Key
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy••••••••••••••••••••••••••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Your key is encrypted with AES-256-GCM before database storage and never returned in plaintext.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setIsEditing(false); setApiKeyInput(''); }}
                style={{ fontSize: 13 }}
              >
                Cancel
              </button>
              {apiKeyInput.trim().length >= 8 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{ fontSize: 13 }}
                >
                  {testing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />} Test Key
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ fontSize: 13 }}
              >
                {saving ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
                  </>
                ) : (
                  'Encrypt & Save Key'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            {providerConfig?.configured && (
              <button
                className="btn-danger"
                onClick={handleRemoveKey}
                style={{ fontSize: 13, padding: '7px 14px' }}
              >
                <Trash2 size={13} /> Remove Custom Key
              </button>
            )}

            <button
              className="btn-secondary"
              onClick={handleTestConnection}
              disabled={testing}
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              {testing ? (
                <>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Testing…
                </>
              ) : (
                <>
                  <RefreshCw size={13} /> Test Connection
                </>
              )}
            </button>

            <button
              className="btn-primary"
              onClick={() => setIsEditing(true)}
              style={{ fontSize: 13, padding: '7px 16px' }}
            >
              <Key size={13} /> {providerConfig?.configured ? 'Update Key' : 'Configure Custom Key'}
            </button>
          </div>
        )}
      </div>

      {/* Security & Logout */}
      <div className="card" style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color="var(--text-muted)" />
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Session Security</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>End active analyst session on this device</span>
          </div>
        </div>

        <button
          className="btn-danger"
          onClick={handleLogout}
          style={{ fontSize: 13, padding: '8px 18px' }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

    </div>
  );
};
