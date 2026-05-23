'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

/* ── types ───────────────────────────────────────────────────────────── */

interface QParam { id: number; key: string; value: string; }
type Tab = 'parse' | 'build';

let _id = 1;
const mkParam = (k = '', v = ''): QParam => ({ id: _id++, key: k, value: v });

interface Parsed {
  protocol: string;   // "https:"
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  params: QParam[];
}

function parseURL(raw: string): Parsed {
  const u   = new URL(raw.trim());
  const params: QParam[] = [];
  u.searchParams.forEach((v, k) => params.push(mkParam(k, v)));
  if (!params.length) params.push(mkParam());
  return {
    protocol: u.protocol,
    username: u.username,
    password: u.password,
    hostname: u.hostname,
    port:     u.port,
    pathname: u.pathname,
    search:   u.search,
    hash:     u.hash,
    origin:   u.origin,
    params,
  };
}

function rebuildURL(p: Parsed, params: QParam[]): string {
  try {
    const u = new URL(p.origin + p.pathname + p.hash);
    u.search = '';
    params.forEach(q => { if (q.key.trim()) u.searchParams.append(q.key.trim(), q.value); });
    return u.toString();
  } catch { return ''; }
}

function assembleURL(proto: string, user: string, pass: string, host: string, port: string, path: string, params: QParam[], hash: string): string {
  if (!host.trim()) return '';
  try {
    const cred = user ? `${user}${pass ? ':' + pass : ''}@` : '';
    const raw  = `${proto}//${cred}${host.trim()}${port ? ':' + port : ''}${path.startsWith('/') ? path : '/' + path}`;
    const u    = new URL(raw);
    u.search   = '';
    params.forEach(q => { if (q.key.trim()) u.searchParams.append(q.key.trim(), q.value); });
    if (hash.trim()) u.hash = hash.replace(/^#/, '');
    return u.toString();
  } catch { return ''; }
}

/* ── segment colours ─────────────────────────────────────────────────── */

const C = {
  scheme:   '#5fb0ff',   // blue
  userinfo: '#c792ea',   // purple
  host:     '#4ad29a',   // green
  port:     '#f0c674',   // yellow
  path:     '#61dafb',   // cyan
  query:    '#ff9d57',   // orange
  fragment: '#e879f9',   // magenta
  sep:      '#3a4554',   // faint
} as const;

/* ── colour-coded URL display ────────────────────────────────────────── */

function ColorURL({ raw }: { raw: string }) {
  let p: URL | null = null;
  try { p = new URL(raw); } catch { /* */ }

  if (!p) {
    return <span style={{ color: 'var(--bp-ink-mute)' }}>{raw}</span>;
  }

  const scheme   = p.protocol + '//';
  const userinfo = p.username ? `${p.username}${p.password ? ':' + p.password : ''}@` : '';
  const host     = p.hostname;
  const port     = p.port ? `:${p.port}` : '';
  const path     = p.pathname;
  const query    = p.search;
  const frag     = p.hash;

  return (
    <>
      <span style={{ color: C.scheme }}>{scheme}</span>
      {userinfo && <span style={{ color: C.userinfo }}>{userinfo}</span>}
      <span style={{ color: C.host }}>{host}</span>
      {port && <span style={{ color: C.port }}>{port}</span>}
      <span style={{ color: C.path }}>{path}</span>
      {query && <span style={{ color: C.query }}>{query}</span>}
      {frag  && <span style={{ color: C.fragment }}>{frag}</span>}
    </>
  );
}

/* ── segment strip ───────────────────────────────────────────────────── */

function SegmentStrip({ p, raw }: { p: Parsed; raw: string }) {
  let u: URL | null = null;
  try { u = new URL(raw); } catch { /* */ }
  if (!u) return null;

  const segs = [
    { label: 'SCHEME',   value: u.protocol.replace(':', ''), color: C.scheme },
    ...(u.username ? [{ label: 'USERINFO', value: u.username + (u.password ? ':' + u.password : ''), color: C.userinfo }] : []),
    { label: 'HOST',     value: u.hostname, color: C.host },
    ...(u.port ? [{ label: 'PORT', value: u.port, color: C.port }] : []),
    { label: 'PATH',     value: u.pathname, color: C.path },
    ...(u.search ? [{ label: 'QUERY', value: u.search, color: C.query }] : []),
    ...(u.hash   ? [{ label: 'FRAGMENT', value: u.hash, color: C.fragment }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)', flexShrink: 0 }}>
      {segs.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'stretch' }}>
          {i > 0 && <div style={{ width: 1, background: 'var(--bp-border)', alignSelf: 'stretch' }} />}
          <div style={{ padding: '7px 14px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: s.color, marginBottom: 2, opacity: 0.7 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: s.color, wordBreak: 'break-all', maxWidth: 200 }}>{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── KV param table ─────────────────────────────────────────────────── */

function ParamTable({ params, onChange, onAdd, onRemove }: {
  params: QParam[];
  onChange: (id: number, f: 'key' | 'value', v: string) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* col headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)', flexShrink: 0 }}>
        <div style={{ padding: '4px 10px', fontSize: 9, color: 'var(--bp-ink-faint)', letterSpacing: '0.18em', textTransform: 'uppercase', borderRight: '1px solid var(--bp-border)' }}>KEY</div>
        <div style={{ padding: '4px 10px', fontSize: 9, color: 'var(--bp-ink-faint)', letterSpacing: '0.18em', textTransform: 'uppercase', borderRight: '1px solid var(--bp-border)' }}>VALUE</div>
        <div />
      </div>
      {/* rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {params.map(p => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', borderBottom: '1px solid var(--bp-border)' }}>
            <input value={p.key} onChange={e => onChange(p.id, 'key', e.target.value)} placeholder='key'
              style={{ background: 'transparent', border: 0, borderRight: '1px solid var(--bp-border)', padding: '6px 10px', color: C.query, fontFamily: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <input value={p.value} onChange={e => onChange(p.id, 'value', e.target.value)} placeholder='value'
              style={{ background: 'transparent', border: 0, borderRight: '1px solid var(--bp-border)', padding: '6px 10px', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <button onClick={() => onRemove(p.id)}
              style={{ background: 'transparent', border: 0, color: 'var(--bp-ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={onAdd}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'transparent', border: 0, borderTop: '1px solid var(--bp-border)', color: 'var(--bp-ink-faint)', fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
        <Plus size={10} /> Add param
      </button>
    </div>
  );
}

/* ── shared panel shell ──────────────────────────────────────────────── */

function Panel({ title, accent, children, style }: { title: string; accent?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: '1px solid var(--bp-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 26, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, background: accent ?? 'var(--bp-accent)', flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── component row ───────────────────────────────────────────────────── */

function CompRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', borderBottom: '1px solid var(--bp-border)', minHeight: 30 }}>
      <div style={{ padding: '6px 10px', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', borderRight: '1px solid var(--bp-border)', display: 'flex', alignItems: 'center' }}>{label}</div>
      <div style={{ padding: '6px 10px', fontSize: 11, color, wordBreak: 'break-all', display: 'flex', alignItems: 'center' }}>{value || <span style={{ color: 'var(--bp-ink-faint)', fontStyle: 'italic' }}>—</span>}</div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────── */

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px', background: 'transparent', border: 0,
  borderBottom: active ? '2px solid var(--bp-accent)' : '2px solid transparent',
  color: active ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
  fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.14em',
  textTransform: 'uppercase', cursor: 'pointer', transition: 'color 100ms', whiteSpace: 'nowrap',
});

export default function URLParserPage() {
  const [tab, setTab] = useState<Tab>('parse');

  /* ── PARSE state ── */
  const [parseInput, setParseInput]   = useState('https://user:pass@api.atomicdevtools.com:8443/v1/users/8pM6?expand=team_perms&fields=id,email#section-3');
  const [parsed,     setParsed]       = useState<Parsed | null>(null);
  const [parseErr,   setParseErr]     = useState<string | null>(null);
  const [parseParams,setParseParams]  = useState<QParam[]>([mkParam()]);

  /* ── BUILD state ── */
  const [bProto,  setBProto]  = useState('https:');
  const [bUser,   setBUser]   = useState('');
  const [bPass,   setBPass]   = useState('');
  const [bHost,   setBHost]   = useState('');
  const [bPort,   setBPort]   = useState('');
  const [bPath,   setBPath]   = useState('/');
  const [bHash,   setBHash]   = useState('');
  const [bParams, setBParams] = useState<QParam[]>([mkParam()]);
  const [builtURL, setBuiltURL] = useState('');

  /* init parse */
  useEffect(() => {
    try {
      const p = parseURL(parseInput);
      setParsed(p);
      setParseParams(p.params);
    } catch { /* */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onParseChange = (val: string) => {
    setParseInput(val);
    if (!val.trim()) { setParsed(null); setParseErr(null); setParseParams([mkParam()]); return; }
    try   { const p = parseURL(val); setParsed(p); setParseParams(p.params); setParseErr(null); }
    catch { setParsed(null); setParseErr('Invalid URL — make sure it includes a protocol (https://)'); }
  };

  const onParamChange = (id: number, f: 'key' | 'value', v: string) => {
    const next = parseParams.map(p => p.id === id ? { ...p, [f]: v } : p);
    setParseParams(next);
    if (parsed) {
      const rebuilt = rebuildURL(parsed, next);
      setParseInput(rebuilt);
      try { setParsed(parseURL(rebuilt)); } catch { /* */ }
    }
  };

  const addParseParam = () => setParseParams(p => [...p, mkParam()]);
  const delParseParam = (id: number) => {
    const next = parseParams.filter(p => p.id !== id);
    const safe = next.length ? next : [mkParam()];
    setParseParams(safe);
    if (parsed) {
      const rebuilt = rebuildURL(parsed, safe);
      setParseInput(rebuilt);
      try { setParsed(parseURL(rebuilt)); } catch { /* */ }
    }
  };

  /* build */
  const rebuild = useCallback(() => {
    setBuiltURL(assembleURL(bProto, bUser, bPass, bHost, bPort, bPath, bParams, bHash));
  }, [bProto, bUser, bPass, bHost, bPort, bPath, bParams, bHash]);
  useEffect(() => { rebuild(); }, [rebuild]);

  const onBParamChange = (id: number, f: 'key' | 'value', v: string) =>
    setBParams(p => p.map(q => q.id === id ? { ...q, [f]: v } : q));
  const addBParam = () => setBParams(p => [...p, mkParam()]);
  const delBParam = (id: number) => setBParams(p => { const n = p.filter(q => q.id !== id); return n.length ? n : [mkParam()]; });

  const CSS: React.CSSProperties = {
    '--bp-bg':         '#0a0e14',
    '--bp-surface':    '#0f141c',
    '--bp-border':     '#1e2d3d',
    '--bp-border-str': '#2a3a52',
    '--bp-ink':        '#cfd8e3',
    '--bp-ink-mute':   '#6b7a8c',
    '--bp-ink-faint':  '#3a4554',
    '--bp-accent':     '#5fb0ff',
  } as React.CSSProperties;

  return (
    <div className='bp-paper h-full flex flex-col overflow-hidden relative' data-cat='api' style={CSS}>
      <div className='bp-ruler-x' />
      <div className='bp-ruler-y' />

      <div className='flex-1 min-h-0 flex flex-col overflow-hidden'
        style={{ paddingLeft: 20, paddingTop: 18, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}>

        {/* ── Tool header ───────────────────────────────────────── */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--bp-ink)', margin: '0 0 3px', letterSpacing: '-0.01em' }}>URL Parser</h1>
          <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Break down URLs into components — and rebuild them from scratch</p>
        </div>

        {/* ── Tab bar ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)', flexShrink: 0 }}>
          <button style={TAB_STYLE(tab === 'parse')} onClick={() => setTab('parse')}>Parse</button>
          <button style={TAB_STYLE(tab === 'build')} onClick={() => setTab('build')}>Build</button>
        </div>

        {/* ══════════════════════ PARSE TAB ════════════════════════ */}
        {tab === 'parse' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* URL input row */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
              {/* colour-coded display */}
              {parseInput && (
                <div style={{ fontSize: 11, lineHeight: 1.7, wordBreak: 'break-all', marginBottom: 8, padding: '6px 10px', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)' }}>
                  <ColorURL raw={parseInput} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 0 }}>
                <input
                  value={parseInput}
                  onChange={e => onParseChange(e.target.value)}
                  placeholder='https://user:pass@example.com:8443/path?key=val#section'
                  style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', borderRight: 0, color: 'var(--bp-ink-mute)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--bp-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--bp-border-str)'; }}
                />
                <BpCopyBtn text={parseInput} />
              </div>
              {parseErr && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#ff7a85', letterSpacing: '0.04em' }}>⚠ {parseErr}</div>
              )}
            </div>

            {/* Segment strip */}
            {parsed && <SegmentStrip p={parsed} raw={parseInput} />}

            {/* Main two-column area */}
            {parsed ? (
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

                {/* Left: URL components */}
                <Panel title='URL COMPONENTS' style={{ borderRight: 0, borderBottom: 0, borderLeft: 0 }}>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    <CompRow label='PROTOCOL' value={parsed.protocol.replace(':', '')} color={C.scheme} />
                    {parsed.username && <CompRow label='USERINFO'  value={parsed.username + (parsed.password ? ':' + parsed.password : '')} color={C.userinfo} />}
                    <CompRow label='HOST'     value={parsed.hostname} color={C.host} />
                    <CompRow label='PORT'     value={parsed.port || '(default)'} color={C.port} />
                    <CompRow label='ORIGIN'   value={parsed.origin}   color='var(--bp-ink)' />
                    <CompRow label='PATH'     value={parsed.pathname}  color={C.path} />
                    <CompRow label='SEARCH'   value={parsed.search || '—'} color={C.query} />
                    <CompRow label='HASH'     value={parsed.hash   || '—'} color={C.fragment} />
                  </div>
                </Panel>

                {/* Right: Query params (editable) */}
                <Panel title='QUERY PARAMETERS' accent={C.query} style={{ borderBottom: 0, borderRight: 0 }}>
                  <ParamTable
                    params={parseParams}
                    onChange={onParamChange}
                    onAdd={addParseParam}
                    onRemove={delParseParam}
                  />
                </Panel>

              </div>
            ) : (
              /* empty state */
              !parseErr && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--bp-ink-faint)' }}>
                  <div style={{ fontSize: 13, letterSpacing: 2, opacity: 0.4 }}>
                    <span style={{ color: C.scheme }}>https://</span>
                    <span style={{ color: C.host }}>example.com</span>
                    <span style={{ color: C.path }}>/path</span>
                    <span style={{ color: C.query }}>?key=val</span>
                    <span style={{ color: C.fragment }}>#hash</span>
                  </div>
                  <p style={{ fontSize: 11, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Paste a URL above to inspect it</p>
                </div>
              )
            )}
          </div>
        )}

        {/* ══════════════════════ BUILD TAB ════════════════════════ */}
        {tab === 'build' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Assembled URL preview */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
              {builtURL ? (
                <div style={{ fontSize: 11, lineHeight: 1.7, wordBreak: 'break-all', marginBottom: 8, padding: '6px 10px', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)' }}>
                  <ColorURL raw={builtURL} />
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--bp-ink-faint)', marginBottom: 8, padding: '6px 10px', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)' }}>
                  Enter a hostname below to start building…
                </div>
              )}
              <div style={{ display: 'flex', gap: 0 }}>
                <input readOnly value={builtURL}
                  style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', borderRight: 0, color: 'var(--bp-ink-mute)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }} />
                <BpCopyBtn text={builtURL} />
              </div>
            </div>

            {/* Segment strip for built URL */}
            {builtURL && <SegmentStrip p={{} as Parsed} raw={builtURL} />}

            {/* Build fields + params */}
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

              {/* Left: URL part inputs */}
              <Panel title='URL PARTS' style={{ borderRight: 0, borderBottom: 0, borderLeft: 0 }}>
                <div style={{ overflowY: 'auto', flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Protocol + host + port */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    <select value={bProto} onChange={e => setBProto(e.target.value)}
                      style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', borderRight: 0, color: C.scheme, fontFamily: 'inherit', fontSize: 11, padding: '6px 8px', outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
                      <option value='https:'>https://</option>
                      <option value='http:'>http://</option>
                      <option value='ftp:'>ftp://</option>
                    </select>
                    <input value={bHost} onChange={e => setBHost(e.target.value)} placeholder='hostname (e.g. example.com)'
                      style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', borderRight: 0, color: C.host, fontFamily: 'inherit', fontSize: 11, padding: '6px 8px', outline: 'none', boxSizing: 'border-box' }} />
                    <input value={bPort} onChange={e => setBPort(e.target.value)} placeholder='port'
                      style={{ width: 64, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: C.port, fontFamily: 'inherit', fontSize: 11, padding: '6px 8px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  {[
                    { label: 'USERNAME', val: bUser, set: setBUser, color: C.userinfo, ph: 'username (optional)' },
                    { label: 'PASSWORD', val: bPass, set: setBPass, color: C.userinfo, ph: 'password (optional)' },
                    { label: 'PATH',     val: bPath, set: setBPath, color: C.path,     ph: '/api/v1/resource' },
                    { label: 'FRAGMENT', val: bHash, set: setBHash, color: C.fragment, ph: 'section-id (no # needed)' },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <div style={{ width: 80, flexShrink: 0, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', padding: '0 10px 0 0' }}>{f.label}</div>
                      <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                        style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: f.color, fontFamily: 'inherit', fontSize: 11, padding: '6px 8px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Right: Query params */}
              <Panel title='QUERY PARAMETERS' accent={C.query} style={{ borderBottom: 0, borderRight: 0 }}>
                <ParamTable
                  params={bParams}
                  onChange={onBParamChange}
                  onAdd={addBParam}
                  onRemove={delBParam}
                />
              </Panel>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
