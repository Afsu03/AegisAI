import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Loader2, AlertCircle,
  RefreshCw, ShieldAlert, ArrowRight, Plus, Trash2, ShieldCheck
} from 'lucide-react';
import type { LogFile, DashboardStats, ThreatEvent } from '../types';
import { getLogFiles, getDashboardStats, getThreats, deleteLogFile } from '../lib/api';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [files,   setFiles]   = useState<LogFile[]>([]);
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete,    setItemToDelete]    = useState<LogFile | null>(null);
  const [isDeleting,      setIsDeleting]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [filesRes, statsRes, threatsRes] = await Promise.all([
        getLogFiles(1, 50),
        getDashboardStats(),
        getThreats(),
      ]);
      setFiles(filesRes.data);
      setStats(statsRes.data);
      setThreats(threatsRes.data);
    } catch (e: any) {
      setError(e?.message ?? 'Cannot reach backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteLogFile(itemToDelete.id);
      setFiles(prev => prev.filter(f => f.id !== itemToDelete.id));
      setThreats(prev => prev.filter(t => t.fileId !== itemToDelete.id));
      setItemToDelete(null);
      setDeleteModalOpen(false);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete file.');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalFiles = files.length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 36, paddingBottom: 64 }}>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Analysis?"
        itemName={itemToDelete?.originalName}
        message="This will permanently remove this analysis and its associated investigation data."
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }
        }}
      />

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Security Intelligence Workspace
          </p>
          <h1 className="page-title" style={{ marginBottom: 6 }}>
            Overview
          </h1>
          <p className="page-description">
            Live security log analyses, calculated risk scores, and autonomous threat detections.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn-secondary"
              onClick={load}
              disabled={loading}
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
              Refresh
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate('/analyses/new')}
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              New Analysis
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
            Total Files Analyzed: <span style={{ color: 'var(--heading-color)', fontWeight: 600 }}>{loading ? '…' : error ? '—' : totalFiles}</span>
          </div>
        </div>
      </div>

      {/* Backend error banner */}
      {error && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '16px 20px',
            background: 'rgba(217, 121, 121, 0.08)',
            border: '1px solid rgba(217, 121, 121, 0.2)',
            borderRadius: 4,
          }}
        >
          <AlertCircle size={18} color="#D97979" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#D97979', marginBottom: 4 }}>
              Backend Connection Error
            </p>
            <p style={{ fontSize: 14, color: '#8C8981' }}>
              {error}
            </p>
            <p style={{ fontSize: 13, color: '#6B6860', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
              Unable to retrieve workspace data. Check that the backend server is running.
            </p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '64px 0' }}>
          <Loader2 size={18} color="#F5F2EA" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#8C8981' }}>Loading workspace data…</span>
        </div>
      )}

      {/* Main Open Analyses List */}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {files.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                No Analyses Yet
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Upload security logs to begin your first investigation.
              </p>
              <button onClick={() => navigate('/analyses/new')} className="btn-primary" style={{ fontSize: 13 }}>
                Start New Analysis
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {files.map((f) => {
                const fileThreats = threats.filter((t) => t.fileId === f.id);
                const hasThreats = fileThreats.length > 0;
                const maxRisk = hasThreats
                  ? Math.max(...fileThreats.map((t) => t.riskScore))
                  : 0;

                // Good score vs Bad score
                const isBad = hasThreats || maxRisk >= 50;
                const displayScore = isBad ? maxRisk : 100;

                return (
                  <div
                    key={f.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      flexWrap: 'wrap',
                      transition: 'all 0.15s ease-in-out',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--text-secondary)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Left File Metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {f.originalName.replace(/\.[^/.]+$/, '')}
                        </span>

                        {isBad ? (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ShieldAlert size={11} />
                            {fileThreats.length} {fileThreats.length === 1 ? 'THREAT' : 'THREATS'} DETECTED
                          </span>
                        ) : (
                          <span className="badge badge-low" style={{ color: '#22C55E', borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.08)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={11} />
                            CLEAN · NO THREATS
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.status}</span>
                        <span>·</span>
                        <span>{f.parsedRecords.toLocaleString()} records</span>
                        <span>·</span>
                        <span>{timeAgo(f.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Right Score & Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                      {/* Score Indicator */}
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 10,
                            color: 'var(--text-muted)',
                            fontFamily: 'JetBrains Mono, monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            marginBottom: 2,
                          }}
                        >
                          {isBad ? 'Threat Risk' : 'Health Score'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 2 }}>
                          <span
                            style={{
                              fontSize: 22,
                              fontWeight: 800,
                              fontFamily: 'JetBrains Mono, monospace',
                              color: isBad ? '#EF4444' : '#22C55E',
                              lineHeight: 1,
                            }}
                          >
                            {displayScore}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 500,
                            }}
                          >
                            /100
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className="btn-secondary"
                          onClick={() => navigate(`/threats?fileId=${f.id}`)}
                          style={{
                            fontSize: 13,
                            padding: '7px 16px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
                          }}
                        >
                          Open <ArrowRight size={13} />
                        </button>

                        <button
                          onClick={() => {
                            setItemToDelete(f);
                            setDeleteModalOpen(true);
                          }}
                          aria-label="Delete analysis"
                          title="Delete Analysis"
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            color: 'var(--text-muted)',
                            padding: '7px 10px',
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
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
