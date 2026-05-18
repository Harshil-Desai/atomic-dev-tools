'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';
import { Wifi, Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

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

      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }

      setResults((prev) => [{
        ...data,
        host: h,
        port: p,
        checkedAt: new Date(),
      }, ...prev].slice(0, 10));
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
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Port Checker / Ping</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Test TCP connectivity to a host:port from the server — bypasses browser CORS restrictions</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-2xl mx-auto space-y-4'>

          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <div className='sm:col-span-2'>
                  <label className='block text-sm font-medium text-gray-300 mb-1'>Host</label>
                  <Input value={host} onChange={(e) => setHost(e.target.value)}
                    placeholder='github.com or 192.168.1.1'
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-1'>Port</label>
                  <Input value={port} onChange={(e) => setPort(e.target.value)}
                    placeholder='443'
                    className='font-mono'
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-1'>Timeout (ms)</label>
                <div className='flex gap-2'>
                  {['2000', '5000', '10000'].map((t) => (
                    <Button key={t} size='sm' variant={timeout === t ? 'default' : 'outline'} onClick={() => setTimeout_(t)}>
                      {parseInt(t) / 1000}s
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={loading} className='w-full' size='lg'>
                <Send className='w-4 h-4 mr-2' />
                {loading ? 'Checking…' : 'Check Port'}
              </Button>
            </CardContent>
          </Card>

          {/* Quick checks */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Quick Checks</p>
              <div className='grid grid-cols-2 gap-2'>
                {QUICK_CHECKS.map((q) => (
                  <button key={q.label}
                    onClick={() => { setHost(q.host); setPort(String(q.port)); runCheck(q.host, q.port); }}
                    disabled={loading}
                    className='text-left rounded-md px-3 py-2 bg-[#121212] hover:bg-[#222] border border-[hsla(0,0%,20%,1)] transition-colors disabled:opacity-50'>
                    <p className='font-mono text-xs text-blue-400'>{q.label}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className='border-red-500/40'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-2 text-red-400'>
                  <AlertCircle className='w-4 h-4 shrink-0' />
                  <span className='text-sm'>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardContent className='pt-6 space-y-3'>
                <p className='text-xs text-gray-500 uppercase tracking-wide'>Results</p>
                {results.map((r, idx) => (
                  <div key={idx} className={`rounded-lg border p-4 ${statusColor(r.status)}`}>
                    <div className='flex items-center gap-3 mb-2'>
                      <StatusIcon status={r.status} />
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='font-mono font-semibold text-sm'>{r.host}:{r.port}</span>
                          {WELL_KNOWN[r.port] && (
                            <span className='text-xs opacity-70'>({WELL_KNOWN[r.port]})</span>
                          )}
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
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
              </CardContent>
            </Card>
          )}

          {/* Well-known ports reference */}
          <Card>
            <CardContent className='pt-6 space-y-2'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Common Ports</p>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-1.5'>
                {Object.entries(WELL_KNOWN).map(([p, name]) => (
                  <button key={p}
                    onClick={() => setPort(p)}
                    className='flex gap-2 items-center text-left rounded px-2 py-1 bg-[#121212] hover:bg-[#222] transition-colors'>
                    <code className='font-mono text-xs text-blue-400 w-10 shrink-0'>{p}</code>
                    <span className='text-xs text-gray-400 truncate'>{name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
