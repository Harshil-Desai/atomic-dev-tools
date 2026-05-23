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
      className='bp-tool-root h-full flex flex-col overflow-hidden'
      data-cat='api'
      style={{
        backgroundImage: `
          linear-gradient(var(--bp-line-major) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-line-major) 1px, transparent 1px),
          linear-gradient(var(--bp-line-minor) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-line-minor) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px, 64px 64px, 8px 8px, 8px 8px',
        backgroundPosition: '-1px -1px',
      }}
    >
      {/* Topbar */}
      <div className='tool-topbar flex-shrink-0'>
        <Shield className='w-3.5 h-3.5 flex-shrink-0' style={{ color: 'var(--bp-ink-mute)' }} />
        <span className='tool-sep'>/</span>
        <span className='tool-name'>CORS Checker</span>
        <div className='tool-spacer' />
        {result && (
          <span
            style={{
              fontSize: '10px',
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
      <div className='flex-1 overflow-hidden flex min-h-0'>
        {/* Left — inputs */}
        <div
          className='flex flex-col flex-shrink-0 overflow-y-auto'
          style={{
            width: '320px',
            borderRight: '1px solid var(--bp-border)',
            padding: '20px',
            gap: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ORIGIN */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: '6px', fontFamily: 'inherit' }}>
              Origin
            </div>
            <input
              className='w-full'
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--bp-border)',
                color: 'var(--bp-ink)',
                fontFamily: 'inherit',
                fontSize: '12px',
                padding: '4px 0',
                outline: 'none',
                width: '100%',
              }}
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              placeholder='https://app.example.com'
              spellCheck={false}
            />
          </div>

          {/* TARGET */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: '6px', fontFamily: 'inherit' }}>
              Target
            </div>
            <input
              className='w-full'
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--bp-border)',
                color: 'var(--bp-ink)',
                fontFamily: 'inherit',
                fontSize: '12px',
                padding: '4px 0',
                outline: 'none',
                width: '100%',
              }}
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder='https://api.example.com/sessions'
              spellCheck={false}
            />
          </div>

          {/* METHOD */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: '8px', fontFamily: 'inherit' }}>
              Method
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
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
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: '8px', fontFamily: 'inherit' }}>
              Headers
            </div>
            {headerTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {headerTags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontFamily: 'inherit',
                      border: '1px solid var(--bp-border-str)',
                      color: 'var(--bp-ink-mute)',
                      background: 'var(--bp-surface)',
                      maxWidth: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{tag}</span>
                    <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--bp-ink-faint)', display: 'flex', alignItems: 'center' }}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--bp-border)',
                color: 'var(--bp-ink)',
                fontFamily: 'inherit',
                fontSize: '12px',
                padding: '4px 0',
                outline: 'none',
                width: '100%',
              }}
              value={headerInput}
              onChange={e => setHeaderInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addHeaderTag(); } }}
              placeholder='Authorization: Bearer token'
              spellCheck={false}
            />
            <div style={{ fontSize: '10px', color: 'var(--bp-ink-faint)', marginTop: '4px', fontFamily: 'inherit' }}>
              Press Enter to add
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* CHECK button */}
          <button
            onClick={check}
            disabled={loading || !target.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
              cursor: loading || !target.trim() ? 'default' : 'pointer',
              border: '1px solid var(--bp-accent)',
              background: 'color-mix(in srgb, var(--bp-accent) 12%, transparent)',
              color: loading || !target.trim() ? 'var(--bp-ink-faint)' : 'var(--bp-accent)',
              borderColor: loading || !target.trim() ? 'var(--bp-border-str)' : 'var(--bp-accent)',
              transition: 'all 120ms',
              width: '100%',
            }}
          >
            {loading ? 'CHECKING…' : 'CHECK CORS'}
          </button>
        </div>

        {/* Right — results */}
        <div className='flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto' style={{ padding: '20px' }}>
          {!result && !fetchError && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--bp-ink-faint)', gap: '12px' }}>
              <Shield size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                Enter a target URL and click Check CORS
              </span>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--bp-ink-faint)' }}>
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>CHECKING…</span>
            </div>
          )}

          {fetchError && (
            <div
              style={{
                padding: '12px 16px',
                border: '1px solid rgba(255,122,133,0.3)',
                background: 'rgba(255,122,133,0.06)',
                color: '#ff7a85',
                fontSize: '12px',
                fontFamily: 'inherit',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.7 }}>Network Error</div>
              {fetchError}
            </div>
          )}

          {analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {analysis.items.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr',
                    gap: '12px',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--bp-border)',
                  }}
                >
                  {/* Number */}
                  <div style={{ fontSize: '10px', fontFamily: 'inherit', color: STATE_COLORS[item.state], letterSpacing: '0.08em', paddingTop: '1px', opacity: 0.8 }}>
                    #{item.num}
                  </div>
                  {/* Content */}
                  <div>
                    <div style={{ fontSize: '12px', color: STATE_COLORS[item.state], fontFamily: 'inherit', marginBottom: '4px', letterSpacing: '0.02em' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--bp-ink)', fontFamily: 'inherit', marginBottom: '4px', letterSpacing: '0.01em' }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--bp-ink-mute)', fontFamily: 'inherit', lineHeight: 1.5 }}>
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}

              {/* Verdict */}
              <div style={{ marginTop: '20px', padding: '12px 0' }}>
                <div
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontFamily: 'inherit',
                    color: analysis.blocked ? '#ff7a85' : '#4ad29a',
                  }}
                >
                  {analysis.blocked
                    ? `REQUEST WOULD BE BLOCKED BY THE BROWSER`
                    : `REQUEST WOULD BE ALLOWED BY THE BROWSER`}
                </div>
                {analysis.blockReason && (
                  <div style={{ fontSize: '11px', color: 'var(--bp-ink-mute)', marginTop: '4px', fontFamily: 'inherit' }}>
                    {analysis.blockReason}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: 'var(--bp-ink-faint)', marginTop: '8px', fontFamily: 'inherit' }}>
                  HTTP {result!.status} — via {result!.requestMethod}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
