import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode, Plus, Search, Loader2, ArrowRight, ShieldAlert, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import type { LogFile, ThreatEvent } from '../types';
import { getLogFiles, getThreats, deleteLogFile } from '../lib/api';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const AnalysesPage: React.FC = () => {
  const navigate = useNavigate();
  const [files,   setFiles]   = useState<LogFile[]>([]);
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<'all' | 'threats' | 'clean' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete,    setItemToDelete]    = useState<{ id: string; name: string } | null>(null);
  const [isDeleting,      setIsDeleting]      = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [filesRes, threatsRes] = await Promise.all([
        getLogFiles(1, 100),
        getThreats(),
      ]);
      setFiles(filesRes.data);
      setThreats(threatsRes.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load analyses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
      setError(err?.message ?? 'Failed to delete analysis.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Build analysis objects — associate files and threats belonging to current user
  const analyses = files.map((file) => {
    const fileThreats = threats.filter((t) => t.fileId === file.id);
    return {
      id:          file.id,
      analysisId:  file.analysisId,
      name:        file.originalName.replace(/\.[^/.]+$/, ''),
      fileName:    file.originalName,
      records:     file.parsedRecords,
      threatCount: fileThreats.length,
      severity:    fileThreats.length > 0
        ? fileThreats.some(t => t.severity === 'CRITICAL' || t.severity === 'HIGH')
          ? 'HIGH'
          : 'MEDIUM'
        : null,
      status:      file.status,
      createdAt:   file.uploadedAt,
    };
  });

  const filteredAnalyses = analyses.filter((a) => {
    if (
      searchQuery &&
      !a.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !a.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filter === 'threats')   return a.threatCount > 0;
    if (filter === 'clean')     return a.threatCount === 0;
    if (filter === 'completed') return a.status === 'READY';
    return true;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 64 }}>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Analysis?"
        itemName={itemToDelete?.name}
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Investigation History
          </p>
          <h1 className="page-title" style={{ marginBottom: 10 }}>My Analyses</h1>
          <p className="page-description">
            Review previous security investigations, benign audit records, and AI-generated intelligence.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn-secondary"
              onClick={loadData}
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
            Total Files Analyzed: <span style={{ color: 'var(--heading-color)', fontWeight: 600 }}>{loading ? '…' : error ? '—' : files.length}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all',       label: 'All Analyses' },
            { id: 'threats',   label: 'With Threats' },
            { id: 'clean',     label: 'Clean / Benign' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              style={{
                fontSize: 13,
                padding: '7px 14px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: filter === tab.id ? 'var(--text-primary)' : 'var(--surface)',
                color:      filter === tab.id ? 'var(--bg)' : 'var(--text-secondary)',
                fontWeight: filter === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search analyses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '64px 0' }}>
          <Loader2 size={18} color="var(--text-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading analyses…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(217,121,121,0.08)',
            border: '1px solid rgba(217,121,121,0.2)',
            borderRadius: 4,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, color: '#D97979', marginBottom: 4 }}>Connection Error</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAnalyses.length === 0 && (
        <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
          <FileCode size={36} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {searchQuery || filter !== 'all' ? 'No Analyses Found' : 'No Analyses Yet'}
          </h3>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.65 }}>
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filter to find analyses.'
              : 'Upload security logs to begin your first investigation.'}
          </p>
          {!searchQuery && filter === 'all' && (
            <button className="btn-primary" onClick={() => navigate('/analyses/new')} style={{ fontSize: 13 }}>
              Start New Analysis
            </button>
          )}
        </div>
      )}

      {/* Analysis List */}
      {!loading && !error && filteredAnalyses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredAnalyses.map((a) => (
            <div
              key={a.id}
              className="card"
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                {/* Name + severity badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="card-title">{a.name}</span>
                  {a.threatCount > 0 ? (
                    <span className={`badge ${a.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldAlert size={10} />
                      {a.threatCount} {a.threatCount === 1 ? 'THREAT' : 'THREATS'}
                    </span>
                  ) : (
                    <span className="badge badge-low" style={{ color: '#22C55E', borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.08)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={11} />
                      CLEAN · NO THREATS
                    </span>
                  )}
                </div>

                {/* Metadata row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{a.status}</span>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Records</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{a.records.toLocaleString()}</span>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{timeAgo(a.createdAt)}</span>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>File</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{a.fileName}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/threats?fileId=${a.id}`)}
                  style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Open Analysis <ArrowRight size={14} />
                </button>

                <button
                  onClick={() => {
                    setItemToDelete({ id: a.id, name: a.fileName });
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
          ))}
        </div>
      )}
    </div>
  );
};
