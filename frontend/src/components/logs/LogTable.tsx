import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2, AlertCircle,
} from 'lucide-react';
import type { LogRecord, PaginatedLogRecords } from '../../types';
import { getLogRecords } from '../../lib/api';

// ─── Level badge colours ───────────────────────────────────────────────────

function levelStyle(level?: string): React.CSSProperties {
  const l = (level ?? '').toUpperCase();
  if (['CRITICAL', 'EMERGENCY', 'ALERT'].includes(l))
    return { color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' };
  if (['ERROR', 'ERR'].includes(l))
    return { color: '#F97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' };
  if (['WARN', 'WARNING'].includes(l))
    return { color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' };
  if (l === 'INFO')
    return { color: '#00D9FF', background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.15)' };
  if (l === 'DEBUG')
    return { color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' };
  if (['ALLOW', 'ACCEPT'].includes(l))
    return { color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' };
  if (['DENY', 'DROP', 'BLOCK', 'REJECT'].includes(l))
    return { color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' };
  return { color: '#71717A', background: '#111111', border: '1px solid #262626' };
}

// ─── Column sort header ────────────────────────────────────────────────────

const LEVELS = ['ALL', 'CRITICAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'DENY', 'ALLOW'];
const PAGE_SIZES = [25, 50, 100];

type SortField = 'rowIndex' | 'timestamp' | 'level' | 'source';
type SortDir   = 'asc' | 'desc';

interface SortHeaderProps {
  label:   string;
  field:   SortField;
  current: SortField;
  dir:     SortDir;
  onSort:  (f: SortField) => void;
  width?:  number;
}

const SortHeader: React.FC<SortHeaderProps> = ({ label, field, current, dir, onSort, width }) => (
  <th
    onClick={() => onSort(field)}
    style={{
      padding: '10px 14px',
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: current === field ? '#00D9FF' : '#52525B',
      background: '#0a0a0a',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      width: width ?? 'auto',
      borderBottom: '1px solid #1c1c1c',
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {label}
      {current === field
        ? (dir === 'asc'
            ? <ChevronUp size={12} />
            : <ChevronDown size={12} />)
        : <ChevronUp size={12} style={{ opacity: 0.2 }} />}
    </span>
  </th>
);

// ─── Main component ────────────────────────────────────────────────────────

interface LogTableProps {
  fileId: string;
}

export const LogTable: React.FC<LogTableProps> = ({ fileId }) => {
  const [records,   setRecords]   = useState<LogRecord[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [page,      setPage]      = useState(1);
  const [limit,     setLimit]     = useState(50);
  const [search,    setSearch]    = useState('');
  const [level,     setLevel]     = useState('ALL');
  const [sortBy,    setSortBy]    = useState<SortField>('rowIndex');
  const [sortDir,   setSortDir]   = useState<SortDir>('asc');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (
    p: number, lim: number, q: string, lvl: string, sb: SortField, sd: SortDir
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res: PaginatedLogRecords = await getLogRecords(fileId, {
        page: p, limit: lim, search: q,
        level: lvl === 'ALL' ? '' : lvl,
        sortBy: sb, sortDir: sd,
      });
      setRecords(res.data);
      setTotal(res.pagination.total);
      setPages(res.pagination.pages);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  // Initial load + reload on any param change
  useEffect(() => {
    load(page, limit, search, level, sortBy, sortDir);
  }, [page, limit, level, sortBy, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  const handleSearch = (q: string) => {
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(1, limit, q, level, sortBy, sortDir);
    }, 350);
  };

  const handleSort = (field: SortField) => {
    const newDir: SortDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(field); setSortDir(newDir); setPage(1);
  };

  const handleLevel = (l: string) => { setLevel(l); setPage(1); };
  const handleLimit = (l: number)  => { setLimit(l); setPage(1); };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Toolbar */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #1c1c1c',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={13} color="#52525B" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search message, source, raw…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 30, fontSize: 12, width: '100%' }}
          />
        </div>

        {/* Level filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => handleLevel(l)}
              style={{
                padding: '4px 10px',
                borderRadius: 3,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                background: level === l ? '#00D9FF' : 'transparent',
                color:      level === l ? '#050505' : '#52525B',
                borderColor: level === l ? '#00D9FF' : '#262626',
                transition: 'all 0.1s',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Rows per page */}
        <select
          value={limit}
          onChange={(e) => handleLimit(Number(e.target.value))}
          className="input"
          style={{ width: 80, fontSize: 12 }}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} rows</option>
          ))}
        </select>

        {/* Count */}
        <span style={{ fontSize: 12, color: '#52525B', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
          {total.toLocaleString()} records
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} color="#EF4444" />
          <span style={{ fontSize: 12, color: '#FCA5A5' }}>{error}</span>
        </div>
      )}

      {/* Loading overlay on table area */}
      {loading && (
        <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <Loader2 size={16} color="#00D9FF" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 12, color: '#52525B' }}>Loading records…</span>
        </div>
      )}

      {/* Table */}
      {!loading && records.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <SortHeader label="#"         field="rowIndex"  current={sortBy} dir={sortDir} onSort={handleSort} width={60} />
                <SortHeader label="Timestamp" field="timestamp" current={sortBy} dir={sortDir} onSort={handleSort} width={180} />
                <SortHeader label="Level"     field="level"     current={sortBy} dir={sortDir} onSort={handleSort} width={100} />
                <SortHeader label="Source"    field="source"    current={sortBy} dir={sortDir} onSort={handleSort} width={160} />
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', background: '#0a0a0a', borderBottom: '1px solid #1c1c1c' }}>
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => {
                const isExpanded = expanded === rec.id;
                return (
                  <React.Fragment key={rec.id}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : rec.id)}
                      style={{
                        background: i % 2 === 0 ? '#050505' : '#080808',
                        cursor: 'pointer',
                        borderBottom: '1px solid #111111',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#0e0e0e')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#050505' : '#080808')}
                    >
                      {/* Row # */}
                      <td style={{ padding: '9px 14px', fontSize: 11, color: '#3f3f46', fontFamily: 'JetBrains Mono, monospace' }}>
                        {rec.rowIndex + 1}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '9px 14px', fontSize: 11, color: '#71717A', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                        {rec.timestamp ?? '—'}
                      </td>

                      {/* Level */}
                      <td style={{ padding: '9px 14px' }}>
                        {rec.level ? (
                          <span
                            style={{
                              ...levelStyle(rec.level),
                              fontSize: 10,
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 3,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {rec.level}
                          </span>
                        ) : (
                          <span style={{ color: '#3f3f46', fontSize: 11 }}>—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '9px 14px', fontSize: 11, color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.source ?? '—'}
                      </td>

                      {/* Message */}
                      <td style={{ padding: '9px 14px', fontSize: 12, color: '#E4E4E7', maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.message ?? rec.raw.slice(0, 200)}
                      </td>
                    </tr>

                    {/* Expanded raw row */}
                    {isExpanded && (
                      <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1c1c1c' }}>
                        <td colSpan={5} style={{ padding: '0 14px 14px' }}>
                          <div style={{ marginTop: 10 }}>
                            <p className="section-label" style={{ marginBottom: 6 }}>Raw Line</p>
                            <div className="code-block" style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {rec.raw}
                            </div>
                            {rec.extra && (() => {
                              try {
                                const parsed = JSON.parse(rec.extra);
                                const keys = Object.keys(parsed).filter(k => parsed[k] !== '' && parsed[k] !== null);
                                if (keys.length === 0) return null;
                                return (
                                  <div style={{ marginTop: 10 }}>
                                    <p className="section-label" style={{ marginBottom: 6 }}>Parsed Fields</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {keys.map(k => (
                                        <span key={k} style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#A1A1AA', background: '#111111', border: '1px solid #1c1c1c', borderRadius: 3, padding: '2px 8px' }}>
                                          <span style={{ color: '#52525B' }}>{k}=</span>{String(parsed[k]).slice(0, 80)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              } catch { return null; }
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty search result */}
      {!loading && records.length === 0 && !error && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#52525B' }}>No records match your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #1c1c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <p style={{ fontSize: 12, color: '#52525B', fontFamily: 'JetBrains Mono, monospace' }}>
            Showing{' '}
            <span style={{ color: '#A1A1AA' }}>
              {((page - 1) * limit + 1).toLocaleString()}–
              {Math.min(page * limit, total).toLocaleString()}
            </span>{' '}
            of <span style={{ color: '#A1A1AA' }}>{total.toLocaleString()}</span>
          </p>

          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { icon: ChevronsLeft,  action: () => setPage(1),           disabled: page === 1 },
              { icon: ChevronLeft,   action: () => setPage(p => p - 1),  disabled: page === 1 },
              { icon: ChevronRight,  action: () => setPage(p => p + 1),  disabled: page >= pages },
              { icon: ChevronsRight, action: () => setPage(pages),       disabled: page >= pages },
            ].map(({ icon: Icon, action, disabled }, idx) => (
              <button
                key={idx}
                onClick={action}
                disabled={disabled}
                style={{
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  background: '#111111',
                  border: '1px solid #262626',
                  cursor: disabled ? 'default' : 'pointer',
                  color: disabled ? '#3f3f46' : '#A1A1AA',
                  opacity: disabled ? 0.4 : 1,
                  transition: 'border-color 0.1s',
                }}
                onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.borderColor = '#00D9FF'; }}
                onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.borderColor = '#262626'; }}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>

          {/* Page jumper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#52525B' }}>Page</span>
            <input
              type="number"
              min={1}
              max={pages}
              value={page}
              onChange={(e) => {
                const v = Math.min(pages, Math.max(1, parseInt(e.target.value) || 1));
                setPage(v);
              }}
              className="input"
              style={{ width: 52, fontSize: 12, textAlign: 'center', padding: '4px 6px' }}
            />
            <span style={{ fontSize: 12, color: '#52525B' }}>of {pages}</span>
          </div>
        </div>
      )}
    </div>
  );
};
