'use client';

import { useState, useRef } from 'react';
import { Send, Plus, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { BpCopyBtn, colorJson } from '@/components/blueprint';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ReqTab = 'params' | 'headers' | 'body' | 'auth';
type ResTab = 'body' | 'headers' | 'timing';

interface KVRow { id: number; enabled: boolean; key: string; value: string; }

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    '#4ad29a',
  POST:   '#f0c674',
  PUT:    '#61dafb',
  PATCH:  '#c792ea',
  DELETE: '#ff7a85',
};

function parseCurl(raw: string): {
  method: HttpMethod;
  url: string;
  headers: { key: string; value: string }[];
  body: string;
} | null {
  const text = raw.trim();
  if (!/^curl\s/i.test(text)) return null;

  // Normalize line continuations
  const line = text.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ');

  // Extract method
  const methodMatch = line.match(/-X\s+([A-Z]+)/i);
  let method: HttpMethod = 'GET';
  if (methodMatch) {
    const m = methodMatch[1].toUpperCase();
    if (['GET','POST','PUT','PATCH','DELETE'].includes(m)) method = m as HttpMethod;
  }

  // Extract URL — first bare http(s):// or quoted url arg
  const urlMatch = line.match(/curl\s+(?:-[^\s]+\s+\S+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/)
    ?? line.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
  if (!urlMatch) return null;
  const url = urlMatch[1];

  // Extract headers
  const headers: { key: string; value: string }[] = [];
  const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
  let hm: RegExpExecArray | null;
  while ((hm = headerRegex.exec(line)) !== null) {
    const colon = hm[1].indexOf(':');
    if (colon > 0) {
      headers.push({ key: hm[1].slice(0, colon).trim(), value: hm[1].slice(colon + 1).trim() });
    }
  }

  // Extract body
  const bodyMatch = line.match(/(?:--data-raw|--data-binary|--data|-d)\s+['"](.+?)['"]\s*(?:-|$)/)
    ?? line.match(/(?:--data-raw|--data-binary|--data|-d)\s+['"](.+?)['"]$/);
  let body = '';
  if (bodyMatch) {
    body = bodyMatch[1];
    // Try to pretty-print JSON
    try { body = JSON.stringify(JSON.parse(body), null, 2); } catch { /* not json */ }
    if (method === 'GET') method = 'POST';
  }

  return { method, url, headers, body };
}

function KvTable({ rows, setter }: {
  rows: KVRow[];
  setter: React.Dispatch<React.SetStateAction<KVRow[]>>;
}) {
  const add = () => setter(p => [...p, { id: Date.now(), enabled: true, key: '', value: '' }]);
  const upd = (id: number, f: keyof KVRow, v: string | boolean) =>
    setter(p => p.map(r => r.id === id ? { ...r, [f]: v } : r));
  const del = (id: number) => setter(p => p.filter(r => r.id !== id));

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 30px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)' }}>
        <div />
        <div style={{ padding: '4px 10px', fontSize: 9, color: 'var(--bp-ink-faint)', letterSpacing: '0.18em', textTransform: 'uppercase', borderRight: '1px solid var(--bp-border)' }}>KEY</div>
        <div style={{ padding: '4px 10px', fontSize: 9, color: 'var(--bp-ink-faint)', letterSpacing: '0.18em', textTransform: 'uppercase', borderRight: '1px solid var(--bp-border)' }}>VALUE</div>
        <div />
      </div>

      {rows.map(row => (
        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 30px', borderBottom: '1px solid var(--bp-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--bp-border)' }}>
            <input
              type='checkbox'
              checked={row.enabled}
              onChange={e => upd(row.id, 'enabled', e.target.checked)}
              style={{ accentColor: 'var(--bp-accent)', cursor: 'pointer', width: 11, height: 11 }}
            />
          </div>
          <input
            value={row.key}
            onChange={e => upd(row.id, 'key', e.target.value)}
            placeholder='key'
            style={{
              background: 'transparent', border: 0, borderRight: '1px solid var(--bp-border)',
              padding: '6px 10px', color: row.enabled ? 'var(--bp-accent)' : 'var(--bp-ink-faint)',
              fontFamily: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <input
            value={row.value}
            onChange={e => upd(row.id, 'value', e.target.value)}
            placeholder='value'
            style={{
              background: 'transparent', border: 0, borderRight: '1px solid var(--bp-border)',
              padding: '6px 10px', color: row.enabled ? 'var(--bp-ink)' : 'var(--bp-ink-faint)',
              fontFamily: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => del(row.id)}
            style={{ background: 'transparent', border: 0, color: 'var(--bp-ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      ))}

      <button
        onClick={add}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', background: 'transparent', border: 0,
          color: 'var(--bp-ink-faint)', fontFamily: 'inherit', fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        <Plus size={10} /> Add
      </button>
    </div>
  );
}

export default function ApiTesterPage() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [reqTab, setReqTab] = useState<ReqTab>('headers');
  const [resTab, setResTab] = useState<ResTab>('body');
  const [timeout, setTimeout_] = useState(30);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [headers, setHeaders] = useState<KVRow[]>([
    { id: 1, enabled: true,  key: 'Authorization', value: 'Bearer eyJ0eXAi...' },
    { id: 2, enabled: true,  key: 'Content-Type',  value: 'application/json' },
    { id: 3, enabled: true,  key: 'Accept',         value: 'application/json' },
    { id: 4, enabled: true,  key: 'User-Agent',     value: 'atomic-dev-tools/0.1' },
  ]);
  const [params, setParams]   = useState<KVRow[]>([{ id: 1, enabled: false, key: '', value: '' }]);
  const [body, setBody]       = useState('');

  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [curlToast, setCurlToast] = useState(false);

  const applyParsedCurl = (parsed: NonNullable<ReturnType<typeof parseCurl>>) => {
    setMethod(parsed.method);
    setUrl(parsed.url);
    if (parsed.headers.length > 0) {
      setHeaders(parsed.headers.map((h, i) => ({ id: Date.now() + i, enabled: true, key: h.key, value: h.value })));
      setReqTab('headers');
    }
    if (parsed.body) {
      setBody(parsed.body);
      setReqTab('body');
    }
    setCurlToast(true);
    setTimeout(() => setCurlToast(false), 2500);
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (/^curl\s/i.test(text.trim())) {
      e.preventDefault();
      const parsed = parseCurl(text);
      if (parsed) applyParsedCurl(parsed);
    }
  };

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const headerMap: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => { headerMap[h.key] = h.value; });

      let finalUrl = url;
      const ep = params.filter(p => p.enabled && p.key);
      if (ep.length > 0) {
        const qs = new URLSearchParams(ep.map(p => [p.key, p.value]));
        finalUrl += (url.includes('?') ? '&' : '?') + qs.toString();
      }

      const ctrl = new AbortController();
      const tid  = window.setTimeout(() => ctrl.abort(), timeout * 1000);

      const t0  = performance.now();
      const res = await fetch(finalUrl, {
        method,
        headers: headerMap,
        body: ['POST', 'PUT', 'PATCH'].includes(method) && body.trim() ? body : undefined,
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const elapsed = Math.round(performance.now() - t0);

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      const ct = res.headers.get('content-type') ?? '';
      let resBody: string;
      if (ct.includes('application/json')) {
        resBody = JSON.stringify(await res.json(), null, 2);
      } else {
        resBody = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        time: elapsed,
        size: new TextEncoder().encode(resBody).length,
      });
      setResTab('body');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(
        msg.includes('abort')           ? `Request timed out after ${timeout}s` :
        msg.includes('Failed to fetch') ? 'Network error — check CORS or the URL' : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendRequest();
  };

  const statusColor = (s: number) =>
    s >= 200 && s < 300 ? '#4ad29a' : s >= 400 ? '#ff7a85' : '#f0c674';

  const fmtSize = (b: number) =>
    b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    background: 'transparent',
    border: 0,
    borderBottom: active ? '2px solid var(--bp-accent)' : '2px solid transparent',
    color: active ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
    fontFamily: 'inherit',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'color 100ms',
    whiteSpace: 'nowrap',
  });

  return (
    <div
      className='bp-paper h-full flex flex-col overflow-hidden relative'
      data-cat='api'
      style={{ '--bp-bg': '#0a0e14', '--bp-surface': '#0f141c', '--bp-elevated': '#131a24', '--bp-border': '#1e2d3d', '--bp-border-str': '#2a3a52', '--bp-ink': '#cfd8e3', '--bp-ink-mute': '#6b7a8c', '--bp-ink-faint': '#3a4554', '--bp-accent': '#5fb0ff' } as React.CSSProperties}
    >
      <div className='bp-ruler-x' />
      <div className='bp-ruler-y' />

      {/* cURL import toast */}
      {curlToast && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bp-elevated)', border: '1px solid var(--bp-border-str)',
          color: '#4ad29a', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '6px 14px', zIndex: 50, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          cURL imported
        </div>
      )}

      <div
        className='flex-1 min-h-0 flex flex-col overflow-hidden'
        style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
      >
        {/* ── Tool header ──────────────────────────────────────────── */}
        <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--bp-ink)', margin: 0, letterSpacing: '-0.01em' }}>API Tester</h1>
          <p style={{ fontSize: 10, color: 'var(--bp-ink-faint)', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Test HTTP endpoints — Ctrl+Enter to send · Paste cURL to import</p>
        </div>

        {/* ── URL Bar ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', padding: '8px 16px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0, gap: 0, alignItems: 'center' }}>
          {/* Method selector */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as HttpMethod)}
              style={{
                appearance: 'none',
                background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', borderRight: 0,
                color: METHOD_COLORS[method], fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                padding: '0 28px 0 10px', letterSpacing: '0.1em', outline: 'none', cursor: 'pointer',
                height: 34, flexShrink: 0,
              }}
            >
              {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={10} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--bp-ink-faint)', pointerEvents: 'none' }} />
          </div>

          {/* URL input */}
          <input
            ref={urlInputRef}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={onKey}
            onPaste={handleUrlPaste}
            placeholder='https://api.example.com/endpoint  —  or paste a cURL command'
            style={{
              flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', borderRight: 0,
              color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12,
              padding: '0 12px', height: 34, outline: 'none', boxSizing: 'border-box',
            }}
          />

          {/* Send button */}
          <button
            onClick={sendRequest}
            disabled={loading || !url.trim()}
            style={{
              background: loading ? 'transparent' : 'var(--bp-accent)',
              border: '1px solid var(--bp-accent)',
              color: loading ? 'var(--bp-accent)' : '#0a0e14',
              fontFamily: 'inherit', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '0 20px', height: 34,
              cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              opacity: !url.trim() ? 0.4 : 1, whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background 120ms, color 120ms',
            }}
          >
            <Send size={11} />
            {loading ? 'SENDING…' : 'SEND'}
          </button>
        </div>

        {/* ── Main split ───────────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

          {/* ──── Left: Request pane ─────────────────────────────── */}
          <div style={{ width: '42%', minWidth: 300, maxWidth: 480, flexShrink: 0, borderRight: '1px solid var(--bp-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Request tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)', flexShrink: 0 }}>
              {(['params', 'headers', 'body', 'auth'] as ReqTab[]).map(t => (
                <button key={t} onClick={() => setReqTab(t)} style={TAB_STYLE(reqTab === t)}>{t}</button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', borderLeft: '1px solid var(--bp-border)' }}>
                <span style={{ fontSize: 9, color: 'var(--bp-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>TIMEOUT</span>
                <input
                  type='number'
                  value={timeout}
                  min={1} max={300}
                  onChange={e => setTimeout_(parseInt(e.target.value) || 30)}
                  style={{ width: 38, background: 'transparent', border: '1px solid var(--bp-border)', color: 'var(--bp-ink-mute)', fontFamily: 'inherit', fontSize: 10, padding: '2px 4px', outline: 'none', textAlign: 'center' }}
                />
                <span style={{ fontSize: 9, color: 'var(--bp-ink-faint)' }}>s</span>
              </div>
            </div>

            {/* Request tab body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {reqTab === 'headers' && <KvTable rows={headers} setter={setHeaders} />}
              {reqTab === 'params'  && <KvTable rows={params}  setter={setParams} />}
              {reqTab === 'body' && (
                <div style={{ height: '100%' }}>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder='{ "key": "value" }'
                    style={{
                      width: '100%', height: '100%', minHeight: 280,
                      background: 'transparent', border: 0,
                      color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12,
                      padding: '12px 14px', resize: 'none', outline: 'none',
                      boxSizing: 'border-box', lineHeight: 1.65,
                    }}
                  />
                </div>
              )}
              {reqTab === 'auth' && (
                <div style={{ padding: '20px 16px', color: 'var(--bp-ink-faint)', fontSize: 11, letterSpacing: '0.06em', lineHeight: 1.6 }}>
                  Add an <span style={{ color: 'var(--bp-accent)' }}>Authorization</span> key-value pair in the Headers tab.
                </div>
              )}
            </div>
          </div>

          {/* ──── Right: Response pane ───────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Error banner */}
            {error && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bp-border)', background: 'rgba(255,122,133,0.07)', display: 'flex', gap: 10, alignItems: 'flex-start', flexShrink: 0 }}>
                <AlertCircle size={13} style={{ color: '#ff7a85', flexShrink: 0, marginTop: 1 }} />
                <pre style={{ margin: 0, fontSize: 12, color: '#ff7a85', fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{error}</pre>
              </div>
            )}

            {/* Response status + stats bar */}
            {response && (
              <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
                <div style={{ padding: '10px 20px', borderRight: '1px solid var(--bp-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
                    color: '#0a0e14', background: statusColor(response.status),
                    padding: '3px 10px', lineHeight: 1,
                  }}>
                    {response.status}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', letterSpacing: '0.04em' }}>{response.statusText}</span>
                </div>
                <div style={{ display: 'flex', marginLeft: 'auto' }}>
                  {[
                    { label: 'TIME', value: `${response.time} ms` },
                    { label: 'SIZE', value: fmtSize(response.size) },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '8px 18px', borderLeft: '1px solid var(--bp-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: 9, color: 'var(--bp-ink-faint)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{s.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--bp-accent)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response tabs */}
            {response && (
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)', flexShrink: 0 }}>
                <div style={{ display: 'flex' }}>
                  {(['body', 'headers', 'timing'] as ResTab[]).map(t => (
                    <button key={t} onClick={() => setResTab(t)} style={TAB_STYLE(resTab === t)}>{t}</button>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                {resTab === 'body' && (
                  <div style={{ padding: '0 12px' }}>
                    <BpCopyBtn text={response.body} />
                  </div>
                )}
              </div>
            )}

            {/* Response content */}
            {response && (
              <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>
                {resTab === 'body' && (
                  <pre style={{ margin: 0, fontSize: 12, fontFamily: 'inherit', lineHeight: 1.65, color: 'var(--bp-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {colorJson(response.body)}
                  </pre>
                )}
                {resTab === 'headers' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 16px', borderBottom: '1px solid var(--bp-border)', padding: '5px 0' }}>
                        <span style={{ fontSize: 11, color: 'var(--bp-accent)', letterSpacing: '0.02em', wordBreak: 'break-all' }}>{k}</span>
                        <span style={{ fontSize: 11, color: 'var(--bp-ink)', wordBreak: 'break-all' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {resTab === 'timing' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 10 }}>
                    {[
                      { label: 'TOTAL TIME',    value: `${response.time} ms`,             color: 'var(--bp-ink)' },
                      { label: 'RESPONSE SIZE', value: fmtSize(response.size),             color: 'var(--bp-ink)' },
                      { label: 'STATUS',        value: `${response.status} ${response.statusText}`, color: statusColor(response.status) },
                    ].map(row => (
                      <>
                        <span key={row.label + 'l'} style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center' }}>{row.label}</span>
                        <span key={row.label + 'v'} style={{ fontSize: 13, color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                      </>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty / loading states */}
            {!response && !error && !loading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--bp-ink-faint)' }}>
                <Send size={34} style={{ opacity: 0.15 }} />
                <p style={{ fontSize: 10, margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Send a request to see the response</p>
              </div>
            )}
            {loading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>SENDING…</span>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
