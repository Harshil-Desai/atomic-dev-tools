'use client';

import { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

interface CorsHeaders {
  'Access-Control-Allow-Origin'?: string;
  'Access-Control-Allow-Methods'?: string;
  'Access-Control-Allow-Headers'?: string;
  'Access-Control-Allow-Credentials'?: string;
  'Access-Control-Max-Age'?: string;
  'Access-Control-Expose-Headers'?: string;
}

interface CorsResult {
  status: number;
  headers: CorsHeaders;
  requestMethod: string;
}

interface CheckItem {
  id: string;
  num: string;
  title: string;
  value: string;
  detail: string;
  state: 'ok' | 'warn' | 'fail' | 'info';
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

function analyseResult(result: CorsResult, origin: string, method: HttpMethod, customHeaders: string[]): { items: CheckItem[]; blocked: boolean; blockReason: string } {
  const items: CheckItem[] = [];
  const h = result.headers;
  let blocked = false;
  let blockReason = '';

  // #01 Origin
  const acao = h['Access-Control-Allow-Origin'];
  if (!acao) {
    items.push({ id: 'origin', num: '01', title: 'Origin header missing', value: 'No Access-Control-Allow-Origin', detail: 'Server did not return an Allow-Origin header. All cross-origin requests will be blocked.', state: 'fail' });
    blocked = true;
    blockReason = 'Missing Access-Control-Allow-Origin header.';
  } else if (acao === '*') {
    items.push({ id: 'origin', num: '01', title: 'Origin matched', value: `Access-Control-Allow-Origin: *`, detail: `Wildcard (*) allows requests from any origin, including ${origin}.`, state: 'ok' });
  } else if (acao === origin) {
    items.push({ id: 'origin', num: '01', title: 'Origin matched', value: `Access-Control-Allow-Origin: ${acao}`, detail: `Server explicitly allows requests from ${origin}.`, state: 'ok' });
  } else {
    items.push({ id: 'origin', num: '01', title: 'Origin mismatch', value: `Access-Control-Allow-Origin: ${acao}`, detail: `Server only allows ${acao}, but your origin is ${origin}.`, state: 'fail' });
    blocked = true;
    blockReason = `Origin ${origin} is not in the allowed list.`;
  }

  // #02 Method
  const acam = h['Access-Control-Allow-Methods'];
  if (acam) {
    const allowed = acam.split(',').map(s => s.trim().toUpperCase());
    const methodOk = allowed.includes(method.toUpperCase()) || allowed.includes('*');
    items.push({
      id: 'method', num: '02', title: methodOk ? 'Method allowed' : 'Method not allowed',
      value: `Access-Control-Allow-Methods: ${acam}`,
      detail: methodOk ? `${method} is included in the allowed methods list.` : `${method} is not allowed. Allowed: ${acam}.`,
      state: methodOk ? 'ok' : 'fail',
    });
    if (!methodOk) { blocked = true; blockReason = blockReason || `Method ${method} is not allowed.`; }
  } else {
    items.push({ id: 'method', num: '02', title: 'Method — no preflight header', value: 'Access-Control-Allow-Methods: (not set)', detail: 'No Allow-Methods header in preflight response. Simple requests (GET/POST) may still work.', state: 'warn' });
  }

  // #03 Headers
  const acah = h['Access-Control-Allow-Headers'];
  if (customHeaders.length > 0) {
    if (acah) {
      const allowed = acah.split(',').map(s => s.trim().toLowerCase());
      const allOk = customHeaders.every(ch => allowed.includes(ch.toLowerCase()) || acah === '*');
      items.push({
        id: 'headers', num: '03', title: allOk ? 'Headers allowed' : 'Header not allowed',
        value: `Access-Control-Allow-Headers: ${acah}`,
        detail: allOk ? `All requested headers are permitted by the server.` : `Some requested headers are not in the allowed list: ${acah}.`,
        state: allOk ? 'ok' : 'fail',
      });
      if (!allOk) { blocked = true; blockReason = blockReason || 'Some request headers are not allowed.'; }
    } else {
      items.push({ id: 'headers', num: '03', title: 'Headers — no preflight header', value: 'Access-Control-Allow-Headers: (not set)', detail: 'Custom headers were requested but server did not respond with Allow-Headers.', state: 'warn' });
    }
  } else if (acah) {
    items.push({ id: 'headers', num: '03', title: 'Header allowed', value: `Access-Control-Allow-Headers: ${acah}`, detail: 'Server specifies which headers are allowed in cross-origin requests.', state: 'ok' });
  }

  // #04 Credentials
  const acac = h['Access-Control-Allow-Credentials'];
  if (acac) {
    const credOk = acac.toLowerCase() === 'true';
    const wildcard = acao === '*';
    if (credOk && wildcard) {
      items.push({ id: 'creds', num: '04', title: 'Wildcard + credentials', value: `Access-Control-Allow-Credentials: true`, detail: "Wildcard origin ('*') cannot be used with credentials — browser will block this.", state: 'fail' });
      blocked = true;
      blockReason = blockReason || "Wildcard origin with credentials is forbidden by the browser.";
    } else {
      items.push({
        id: 'creds', num: '04', title: 'Credentials',
        value: `Access-Control-Allow-Credentials: ${acac}`,
        detail: credOk ? 'Cookies and Authorization headers will be sent with cross-origin requests.' : 'Credentials (cookies, auth headers) will not be sent.',
        state: credOk ? 'ok' : 'info',
      });
    }
  }

  // #05 Max-Age
  const maxAge = h['Access-Control-Max-Age'];
  if (maxAge) {
    items.push({ id: 'maxage', num: '05', title: 'Max-Age cache', value: `Access-Control-Max-Age: ${maxAge}`, detail: `Preflight cached for ${maxAge}s — browser won't re-send OPTIONS for ${maxAge} seconds.`, state: 'info' });
  }

  // #06 Expose-Headers
  const expose = h['Access-Control-Expose-Headers'];
  if (expose) {
    items.push({ id: 'expose', num: '06', title: 'Expose-Headers', value: `Access-Control-Expose-Headers: ${expose}`, detail: `These headers are accessible from JavaScript: ${expose}.`, state: 'info' });
  }

  return { items, blocked, blockReason };
}

const STATE_COLORS = {
  ok:   '#4ad29a',
  warn: '#f0c674',
  fail: '#ff7a85',
  info: '#5fb0ff',
};

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#5fb0ff',
} as React.CSSProperties;

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

export default function CorsCheckerPage() {
  const [origin, setOrigin] = useState('');
  const [target, setTarget] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headerInput, setHeaderInput] = useState('');
  const [headerTags, setHeaderTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorsResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const addHeaderTag = () => {
    const trimmed = headerInput.trim();
    if (trimmed && !headerTags.includes(trimmed)) setHeaderTags(prev => [...prev, trimmed]);
    setHeaderInput('');
  };

  const removeTag = (tag: string) => setHeaderTags(prev => prev.filter(t => t !== tag));

  const normalizeCorsHeaders = (response: Response): CorsHeaders => {
    const out: CorsHeaders = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('access-control-')) {
        const norm = key.split('-').map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('-') as keyof CorsHeaders;
        out[norm] = value;
      }
    });
    return out;
  };

  const check = async () => {
    if (!target.trim()) return;
    setLoading(true);
    setResult(null);
    setFetchError(null);
    try {
      const reqHeaders: Record<string, string> = {
        Origin: origin || window.location.origin,
        'Access-Control-Request-Method': method,
      };
      if (headerTags.length > 0) reqHeaders['Access-Control-Request-Headers'] = headerTags.join(', ');
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      try {
        const res = await fetch(target, { method: 'OPTIONS', headers: reqHeaders, signal: ctrl.signal });
        clearTimeout(t);
        setResult({ status: res.status, headers: normalizeCorsHeaders(res), requestMethod: 'OPTIONS (Preflight)' });
      } catch {
        clearTimeout(t);
        const ctrl2 = new AbortController();
        const t2 = setTimeout(() => ctrl2.abort(), 10000);
        try {
          const res2 = await fetch(target, { method, headers: { Origin: origin }, signal: ctrl2.signal });
          clearTimeout(t2);
          setResult({ status: res2.status, headers: normalizeCorsHeaders(res2), requestMethod: method });
        } catch (e2) {
          setFetchError(e2 instanceof Error ? e2.message : 'Network error');
        }
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const customHeaderNames = headerTags.map(t => t.split(':')[0].trim());
  const analysis = result ? analyseResult(result, origin, method, customHeaderNames) : null;

  return (
    <div
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='api'
      style={{
        ...CSS_VARS,
        background: 'var(--bp-bg)',
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        color: 'var(--bp-ink)',
      }}
    >
      {/* Header */}
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0 flex items-center gap-3 sm:gap-4 md:gap-5'>
        <Shield size={14} style={{ color: 'var(--bp-ink-mute)', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1' style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            CORS Checker
          </h1>
          <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0' style={{ letterSpacing: '0.08em' }}>
            Simulate preflight requests and diagnose CORS issues
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {result && (
          <span
            className='text-xs sm:text-sm whitespace-nowrap'
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: analysis?.blocked ? '#ff7a85' : '#4ad29a',
              fontFamily: 'inherit',
            }}
          >
            {analysis?.blocked ? '● BLOCKED' : '● ALLOWED'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className='flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] overflow-hidden' style={{ minHeight: 0 }}>
        {/* Left — inputs panel */}
        <Panel title="Request Config" style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '16px 14px', gap: 16 }}>
            {/* ORIGIN */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 6, fontFamily: 'inherit' }}>
                Origin
              </div>
              <input
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder='https://app.example.com'
                spellCheck={false}
                style={{
                  width: '100%',
                  background: 'var(--bp-bg)',
                  border: '1px solid var(--bp-border-str)',
                  color: 'var(--bp-ink)',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  padding: '7px 10px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* TARGET */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 6, fontFamily: 'inherit' }}>
                Target URL
              </div>
              <input
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder='https://api.example.com/sessions'
                spellCheck={false}
                style={{
                  width: '100%',
                  background: 'var(--bp-bg)',
                  border: '1px solid var(--bp-border-str)',
                  color: 'var(--bp-ink)',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  padding: '7px 10px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* METHOD */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 8, fontFamily: 'inherit' }}>
                Method
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {METHODS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className='min-h-10 px-3'
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      border: `1px solid ${method === m ? 'var(--bp-accent)' : 'var(--bp-border-str)'}`,
                      background: method === m ? 'color-mix(in srgb, var(--bp-accent) 15%, transparent)' : 'transparent',
                      color: method === m ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
                      transition: 'all 100ms',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* HEADERS */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 8, fontFamily: 'inherit' }}>
                Request Headers
              </div>
              {headerTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {headerTags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 6px',
                        fontSize: 10,
                        fontFamily: 'inherit',
                        border: '1px solid var(--bp-border-str)',
                        color: 'var(--bp-ink-mute)',
                        background: 'var(--bp-elevated)',
                        maxWidth: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{tag}</span>
                      <button
                        onClick={() => removeTag(tag)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--bp-ink-faint)', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={headerInput}
                onChange={e => setHeaderInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addHeaderTag(); } }}
                placeholder='Authorization: Bearer token'
                spellCheck={false}
                style={{
                  width: '100%',
                  background: 'var(--bp-bg)',
                  border: '1px solid var(--bp-border-str)',
                  color: 'var(--bp-ink)',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  padding: '7px 10px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--bp-ink-faint)', marginTop: 4, fontFamily: 'inherit' }}>
                Press Enter to add
              </div>
            </div>

            <div style={{ flex: 1 }} />
          </div>

          {/* Actions bar */}
          <div className='p-2 sm:p-3 flex items-center gap-2 sm:gap-3' style={{ borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button
              onClick={check}
              disabled={loading || !target.trim()}
              className='flex-1 min-h-10 px-3'
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                cursor: loading || !target.trim() ? 'default' : 'pointer',
                border: `1px solid ${loading || !target.trim() ? 'var(--bp-border-str)' : 'var(--bp-accent)'}`,
                background: loading || !target.trim() ? 'transparent' : 'color-mix(in srgb, var(--bp-accent) 12%, transparent)',
                color: loading || !target.trim() ? 'var(--bp-ink-faint)' : 'var(--bp-accent)',
                transition: 'all 120ms',
              }}
            >
              {loading ? 'CHECKING…' : 'CHECK CORS'}
            </button>
          </div>
        </Panel>

        {/* Right — results panel */}
        <Panel title="Analysis" meta={result ? `HTTP ${result.status} — ${result.requestMethod}` : undefined} style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {!result && !fetchError && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--bp-ink-faint)', gap: 12, padding: 24 }}>
                <Shield size={32} style={{ opacity: 0.2 }} />
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                  Enter a target URL and click Check CORS
                </span>
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--bp-ink-faint)' }}>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>CHECKING…</span>
              </div>
            )}

            {fetchError && (
              <div style={{ padding: '14px 16px' }}>
                <div
                  style={{
                    padding: '12px 14px',
                    border: '1px solid rgba(255,122,133,0.3)',
                    background: 'rgba(255,122,133,0.06)',
                    color: '#ff7a85',
                    fontSize: 12,
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 }}>Network Error</div>
                  {fetchError}
                </div>
              </div>
            )}

            {analysis && (
              <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
                {analysis.items.map(item => (
                  <div
                    key={item.id}
                    className='grid grid-cols-[36px_1fr] gap-3 py-3'
                    style={{
                      borderBottom: '1px solid var(--bp-border)',
                    }}
                  >
                    {/* Number */}
                    <div style={{ fontSize: 10, fontFamily: 'inherit', color: STATE_COLORS[item.state], letterSpacing: '0.08em', paddingTop: 1, opacity: 0.8 }}>
                      #{item.num}
                    </div>
                    {/* Content */}
                    <div>
                      <div style={{ fontSize: 12, color: STATE_COLORS[item.state], fontFamily: 'inherit', marginBottom: 4, letterSpacing: '0.02em' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--bp-ink)', fontFamily: 'inherit', marginBottom: 4, letterSpacing: '0.01em' }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--bp-ink-mute)', fontFamily: 'inherit', lineHeight: 1.5 }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Verdict */}
                <div style={{ padding: '16px 0', marginTop: 4 }}>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      fontFamily: 'inherit',
                      color: analysis.blocked ? '#ff7a85' : '#4ad29a',
                    }}
                  >
                    {analysis.blocked
                      ? 'REQUEST WOULD BE BLOCKED BY THE BROWSER'
                      : 'REQUEST WOULD BE ALLOWED BY THE BROWSER'}
                  </div>
                  {analysis.blockReason && (
                    <div style={{ fontSize: 11, color: 'var(--bp-ink-mute)', marginTop: 4, fontFamily: 'inherit' }}>
                      {analysis.blockReason}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-faint)', marginTop: 8, fontFamily: 'inherit' }}>
                    HTTP {result!.status} — via {result!.requestMethod}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
