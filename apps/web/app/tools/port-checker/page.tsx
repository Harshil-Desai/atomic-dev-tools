'use client';

import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

type CheckStatus = 'open' | 'closed' | 'timeout' | 'error';

interface CheckResult {
  status: CheckStatus;
  host: string;
  port: number;
  resolvedIP: string | null;
  latencyMs: number;
  error?: string;
  checkedAt: Date;
}

// ─── well-known ports ─────────────────────────────────────────────────────────

const WELL_KNOWN: Record<number, string> = {
  20: 'FTP data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
  53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
  465: 'SMTPS', 587: 'SMTP submission', 993: 'IMAPS', 995: 'POP3S',
  1433: 'MSSQL', 3306: 'MySQL', 5432: 'PostgreSQL', 6379: 'Redis',
  8080: 'HTTP alt', 8443: 'HTTPS alt', 9200: 'Elasticsearch', 27017: 'MongoDB',
};

const QUICK_CHECKS = [
  { host: 'google.com', port: 443, label: 'google.com:443' },
  { host: 'github.com', port: 22, label: 'github.com:22 (SSH)' },
  { host: 'github.com', port: 443, label: 'github.com:443' },
  { host: '1.1.1.1', port: 53, label: '1.1.1.1:53 (DNS)' },
];

// ─── css vars ─────────────────────────────────────────────────────────────────

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#b48cff',
} as React.CSSProperties;

// ─── panel component ──────────────────────────────────────────────────────────

function Panel({ title, meta, children, style }: { title: string; meta?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bp-border)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{title}</span>
        {meta && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--bp-ink-faint)' }}>{meta}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PortCheckerPage() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [timeout, setTimeout_] = useState('5000');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async (h: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ host: h, port: String(p), timeout: timeout || '5000' });
      const res = await fetch(`/api/port-check?${params}`);
      const data = await res.json() as CheckResult & { error?: string };
      if (!res.ok) { setError(data.error || 'Request failed'); return; }
      setResults((prev) => [{ ...data, host: h, port: p, checkedAt: new Date() }, ...prev].slice(0, 10));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    const p = parseInt(port, 10);
    if (!host.trim()) { setError('Enter a host'); return; }
    if (isNaN(p) || p < 1 || p > 65535) { setError('Port must be 1–65535'); return; }
    runCheck(host.trim(), p);
  };

  const StatusIcon = ({ status }: { status: CheckStatus }) => {
    if (status === 'open') return <CheckCircle className='w-5 h-5 text-green-400 shrink-0' />;
    if (status === 'closed') return <XCircle className='w-5 h-5 text-red-400 shrink-0' />;
    if (status === 'timeout') return <Clock className='w-5 h-5 text-yellow-400 shrink-0' />;
    return <AlertCircle className='w-5 h-5 text-orange-400 shrink-0' />;
  };

  const statusColor = (s: CheckStatus) => ({
    open: 'text-green-400 bg-green-500/10 border-green-500/30',
    closed: 'text-red-400 bg-red-500/10 border-red-500/30',
    timeout: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    error: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  }[s]);

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='systems'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* header */}
      <div className='p-4 sm:p-5 md:p-6' style={{ borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1' style={{ fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Port Checker</h1>
        <p className='text-xs sm:text-sm' style={{ color: 'var(--bp-ink-mute)', margin: 0 }}>Test TCP port connectivity for any host and port combination</p>
      </div>

      {/* content */}
      <div className='grid grid-cols-1 lg:grid-cols-2' style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* left column — inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--bp-border)', borderBottomWidth: 0 }} className='lg:border-r lg:border-b-0 border-b border-[var(--bp-border)]'>

          {/* check port panel */}
          <Panel title='Check Port' style={{ border: 0, borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Host</label>
                  <input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder='github.com or 192.168.1.1'
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Port</label>
                  <input
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder='443'
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box', width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Timeout</label>
                <div className='flex gap-2 sm:gap-3' style={{ gap: 6 }}>
                  {['2000', '5000', '10000'].map((t) => (
                    <button
                      key={t}
                      type='button'
                      onClick={() => setTimeout_(t)}
                      className='bp-btn min-h-10 px-2 sm:px-3 py-2'
                      style={timeout === t ? { background: 'var(--bp-accent)', color: '#0a0e14', borderColor: 'var(--bp-accent)', fontWeight: 700 } : {}}
                    >
                      {parseInt(t) / 1000}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className='p-2 sm:p-3' style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
              <button
                type='button'
                className='bp-btn min-h-10 px-3 py-2'
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bp-accent)', color: '#0a0e14', borderColor: 'var(--bp-accent)', fontWeight: 700, opacity: loading ? 0.6 : 1 }}
              >
                <Send style={{ width: 13, height: 13 }} />
                {loading ? 'Checking…' : 'CHECK PORT'}
              </button>
            </div>
          </Panel>

          {/* quick checks panel */}
          <Panel title='Quick Checks' style={{ border: 0, borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
            <div className='p-2 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {QUICK_CHECKS.map((q) => (
                <button
                  key={q.label}
                  type='button'
                  onClick={() => { setHost(q.host); setPort(String(q.port)); runCheck(q.host, q.port); }}
                  disabled={loading}
                  className='min-h-10 px-2 sm:px-3 py-2'
                  style={{
                    textAlign: 'left',
                    background: 'var(--bp-bg)',
                    border: '1px solid var(--bp-border)',
                    color: 'var(--bp-accent)',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'border-color 0.15s',
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </Panel>

          {/* common ports panel */}
          <Panel title='Common Ports' style={{ border: 0, flex: 1, overflow: 'hidden' }}>
            <div className='p-2 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3 overflow-y-auto' style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              {Object.entries(WELL_KNOWN).map(([p, name]) => (
                <button
                  key={p}
                  type='button'
                  onClick={() => setPort(p)}
                  className='min-h-10 px-2 sm:px-3 py-2'
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    textAlign: 'left',
                    background: 'var(--bp-bg)',
                    border: '1px solid var(--bp-border)',
                    color: 'var(--bp-ink)',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <code style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--bp-accent)', width: 36, flexShrink: 0 }}>{p}</code>
                  <span style={{ color: 'var(--bp-ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                </button>
              ))}
            </div>
          </Panel>

        </div>

        {/* right column — results */}
        <Panel title='Results' meta={results.length > 0 ? `${results.length} check${results.length !== 1 ? 's' : ''}` : undefined} style={{ border: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.15)', flexShrink: 0 }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {results.length === 0 && !error && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 40 }}>
                <Send style={{ width: 28, height: 28, color: 'var(--bp-ink-faint)', opacity: 0.5 }} />
                <span style={{ fontSize: 12, color: 'var(--bp-ink-mute)' }}>Run a check to see results</span>
              </div>
            )}

            {results.map((r, idx) => (
              <div key={idx} className={`rounded-lg border p-4 ${statusColor(r.status)}`}>
                <div className='flex items-center gap-3 mb-2'>
                  <StatusIcon status={r.status} />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-mono font-semibold text-sm'>{r.host}:{r.port}</span>
                      {WELL_KNOWN[r.port] && <span className='text-xs opacity-70'>({WELL_KNOWN[r.port]})</span>}
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${statusColor(r.status)}`}>{r.status}</span>
                    </div>
                    {r.resolvedIP && r.resolvedIP !== r.host && (
                      <p className='text-xs opacity-60 font-mono mt-0.5'>Resolved: {r.resolvedIP}</p>
                    )}
                  </div>
                  <span className='text-xs opacity-70 shrink-0'>{r.latencyMs}ms</span>
                </div>
                {r.error && <p className='text-xs opacity-70 mt-1 font-mono'>{r.error}</p>}
                <p className='text-xs opacity-50 mt-1'>{r.checkedAt.toLocaleTimeString()}</p>
              </div>
            ))}

          </div>
        </Panel>

      </div>
    </div>
  );
}
