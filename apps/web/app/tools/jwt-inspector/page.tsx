'use client';

import { useState, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BpCopyBtn, colorJson } from '@/components/blueprint';

/* ── helpers ─────────────────────────────────────────────────────────── */

function b64urlDecode(s: string): string {
  let p = s.replace(/-/g, '+').replace(/_/g, '/');
  while (p.length % 4) p += '=';
  return atob(p);
}

function formatUTC(unix: number) {
  return new Date(unix * 1000).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function lifetime(iat: number, exp: number) {
  const secs = exp - iat;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || `${secs}s`;
}

function sigInfo(alg: string, sigB64: string) {
  // raw bytes of the signature
  let bytes = 0;
  try { bytes = atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')).length; } catch { /* */ }
  const bits = bytes * 8;
  const chars = sigB64.length;
  return { chars, bits, alg };
}

interface Parsed {
  header:     Record<string, unknown>;
  payload:    Record<string, unknown>;
  headerRaw:  string;
  payloadRaw: string;
  sigRaw:     string;  // raw base64url
}

function parse(token: string): Parsed {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('JWT must have exactly 3 dot-separated parts.');
  const header  = JSON.parse(b64urlDecode(parts[0]));
  const payload = JSON.parse(b64urlDecode(parts[1]));
  return {
    header,
    payload,
    headerRaw:  JSON.stringify(header,  null, 2),
    payloadRaw: JSON.stringify(payload, null, 2),
    sigRaw:     parts[2],
  };
}

/* ── sub-components ──────────────────────────────────────────────────── */

const ACCENT = 'var(--bp-accent)';     // blue  — header
const P_CLR  = '#4ad29a';              // green — payload
const S_CLR  = '#ff7a85';              // coral — signature

function Panel({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: '1px solid var(--bp-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 26, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, background: ACCENT, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ padding: '10px 12px', flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid var(--bp-border)' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: color ?? 'var(--bp-ink)', letterSpacing: '0.02em', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────── */

export default function JWTInspectorPage() {
  const [token,  setToken]  = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [err,    setErr]    = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [verifyResult, setVerifyResult] = useState<'ok' | 'fail' | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const onChange = (val: string) => {
    setToken(val);
    setVerifyResult(null);
    if (!val.trim()) { setParsed(null); setErr(null); return; }
    try   { setParsed(parse(val)); setErr(null); }
    catch (e) { setParsed(null); setErr(e instanceof Error ? e.message : 'Parse error'); }
  };

  /* HMAC-SHA verify via SubtleCrypto */
  const verify = async () => {
    if (!parsed || !secret) return;
    try {
      const parts = token.trim().split('.');
      const enc   = new TextEncoder();
      const alg   = (parsed.header.alg as string) ?? '';
      const hashMap: Record<string, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
      const hash  = hashMap[alg];
      if (!hash) { setVerifyResult('fail'); return; }

      const key = await crypto.subtle.importKey(
        'raw', enc.encode(secret),
        { name: 'HMAC', hash }, false, ['verify']
      );
      // decode the existing signature
      let sigStr = parts[2].replace(/-/g, '+').replace(/_/g, '/');
      while (sigStr.length % 4) sigStr += '=';
      const sigBuf = Uint8Array.from(atob(sigStr), c => c.charCodeAt(0));

      const ok = await crypto.subtle.verify(
        'HMAC', key, sigBuf, enc.encode(`${parts[0]}.${parts[1]}`)
      );
      setVerifyResult(ok ? 'ok' : 'fail');
    } catch {
      setVerifyResult('fail');
    }
  };

  /* derive display pieces */
  const parts = token.trim().split('.');
  const has3  = parts.length === 3;

  const exp    = typeof parsed?.payload.exp === 'number' ? parsed.payload.exp : null;
  const iat    = typeof parsed?.payload.iat === 'number' ? parsed.payload.iat : null;
  const nbf    = typeof parsed?.payload.nbf === 'number' ? parsed.payload.nbf : null;
  const isExp  = exp != null && exp * 1000 < Date.now();
  const alg    = typeof parsed?.header.alg === 'string' ? parsed.header.alg : '';
  const info   = parsed ? sigInfo(alg, parsed.sigRaw) : null;

  const CSS: React.CSSProperties = {
    '--bp-bg':         '#0a0e14',
    '--bp-surface':    '#0f141c',
    '--bp-elevated':   '#131a24',
    '--bp-border':     '#1e2d3d',
    '--bp-border-str': '#2a3a52',
    '--bp-ink':        '#cfd8e3',
    '--bp-ink-mute':   '#6b7a8c',
    '--bp-ink-faint':  '#3a4554',
    '--bp-accent':     '#5fb0ff',
  } as React.CSSProperties;

  return (
    <div
      className='bp-paper h-full flex flex-col overflow-hidden relative'
      data-cat='api'
      style={CSS}
    >
      <div className='bp-ruler-x' />
      <div className='bp-ruler-y' />

      <div
        className='flex-1 min-h-0 flex flex-col overflow-hidden'
        style={{ paddingLeft: 20, paddingTop: 18, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
      >
        {/* ── Tool header ─────────────────────────────────────── */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--bp-ink)', margin: '0 0 3px', letterSpacing: '-0.01em' }}>JWT Inspector</h1>
          <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Decode &amp; inspect JSON Web Tokens — header, payload, signature, claims</p>
        </div>

        {/* ── Token input ─────────────────────────────────────── */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
          {/* Color-coded token display — sits above the textarea */}
          {token && (
            <div style={{ fontSize: 11, lineHeight: 1.7, wordBreak: 'break-all', marginBottom: 8, padding: '8px 10px', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)' }}>
              {has3 ? (
                <>
                  <span style={{ color: ACCENT }}>{parts[0]}</span>
                  <span style={{ color: 'var(--bp-ink-faint)' }}>.</span>
                  <span style={{ color: P_CLR }}>{parts[1]}</span>
                  <span style={{ color: 'var(--bp-ink-faint)' }}>.</span>
                  <span style={{ color: S_CLR }}>{parts[2]}</span>
                </>
              ) : (
                <span style={{ color: 'var(--bp-ink-mute)' }}>{token}</span>
              )}
            </div>
          )}

          <textarea
            ref={taRef}
            value={token}
            onChange={e => onChange(e.target.value)}
            placeholder='Paste a JWT token here — eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            rows={token ? 2 : 4}
            style={{
              width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)',
              color: 'var(--bp-ink-mute)', fontFamily: 'inherit', fontSize: 11,
              padding: '8px 10px', resize: 'vertical', outline: 'none',
              boxSizing: 'border-box', lineHeight: 1.6,
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--bp-accent)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--bp-border-str)'; }}
          />

          {err && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#ff7a85', letterSpacing: '0.04em' }}>
              ⚠ {err}
            </div>
          )}
        </div>

        {/* ── Main body ───────────────────────────────────────── */}
        {parsed ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Three panels */}
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 280px', overflow: 'hidden' }}>

              {/* 01 — HEADER */}
              <Panel title='01 — HEADER' style={{ borderRight: 0, borderBottom: 0 }}>
                {/* Metadata row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {parsed.header.alg != null && (
                    <div style={{ padding: '3px 10px', border: `1px solid ${ACCENT}`, color: ACCENT, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(95,176,255,0.08)' }}>
                      {String(parsed.header.alg)}
                    </div>
                  )}
                  {parsed.header.typ != null && (
                    <div style={{ padding: '3px 10px', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink-mute)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {String(parsed.header.typ)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <BpCopyBtn text={parsed.headerRaw} />
                </div>
                <pre style={{ margin: 0, fontSize: 11, fontFamily: 'inherit', lineHeight: 1.65, color: 'var(--bp-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {colorJson(parsed.headerRaw)}
                </pre>
              </Panel>

              {/* 02 — PAYLOAD */}
              <Panel title='02 — PAYLOAD' style={{ borderRight: 0, borderBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <BpCopyBtn text={parsed.payloadRaw} />
                </div>
                <pre style={{ margin: 0, fontSize: 11, fontFamily: 'inherit', lineHeight: 1.65, color: 'var(--bp-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {colorJson(parsed.payloadRaw)}
                </pre>
              </Panel>

              {/* 03 — SIGNATURE + CRYPTO */}
              <div style={{ border: '1px solid var(--bp-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: 0 }}>
                {/* Signature bytes display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 26, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, background: S_CLR, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>03 — SIGNATURE</span>
                </div>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bp-border)', overflow: 'auto', maxHeight: 100 }}>
                  <span style={{ fontSize: 10, color: S_CLR, wordBreak: 'break-all', lineHeight: 1.6 }}>{parsed.sigRaw}</span>
                </div>

                {/* CRYPTO section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 24, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)' }}>CRYPTO</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--bp-border)' }}>
                  {info && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.06em' }}>Signature</span>
                        <span style={{ fontSize: 11, color: 'var(--bp-ink)' }}>{info.chars} chars · {info.bits} bits</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.06em' }}>Algorithm</span>
                        <span style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{alg || 'N/A'} REQUIRED</span>
                      </div>
                    </>
                  )}
                </div>

                {/* VERIFY section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 24, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-bg)', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)' }}>VERIFY SIGNATURE</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={secret}
                    onChange={e => { setSecret(e.target.value); setVerifyResult(null); }}
                    placeholder='Secret key (HMAC only)'
                    style={{
                      background: 'var(--bp-bg)', border: '1px solid var(--bp-border)',
                      color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11,
                      padding: '5px 8px', outline: 'none', width: '100%', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--bp-accent)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--bp-border)'; }}
                  />
                  <button
                    onClick={verify}
                    disabled={!secret}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      background: 'transparent', border: `1px solid ${ACCENT}`,
                      color: ACCENT, fontFamily: 'inherit', fontSize: 10,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '6px 0', cursor: secret ? 'pointer' : 'not-allowed',
                      opacity: secret ? 1 : 0.45, transition: 'opacity 120ms',
                    }}
                  >
                    <ShieldCheck size={11} /> VERIFY
                  </button>
                  {verifyResult && (
                    <div style={{
                      padding: '5px 8px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: verifyResult === 'ok' ? '#4ad29a' : '#ff7a85',
                      border: `1px solid ${verifyResult === 'ok' ? '#4ad29a' : '#ff7a85'}`,
                      background: verifyResult === 'ok' ? 'rgba(74,210,154,0.08)' : 'rgba(255,122,133,0.08)',
                      textAlign: 'center',
                    }}>
                      {verifyResult === 'ok' ? '✓ Signature valid' : '✗ Signature invalid'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Time claims bar ──────────────────────────────── */}
            <div style={{ display: 'flex', borderTop: '1px solid var(--bp-border)', flexShrink: 0, background: 'var(--bp-surface)' }}>
              {iat  != null && <StatCell label='ISSUED AT'  value={formatUTC(iat)} />}
              {nbf  != null && <StatCell label='NOT BEFORE' value={formatUTC(nbf)} />}
              {exp  != null && <StatCell label='EXPIRES AT' value={formatUTC(exp)} />}
              {iat  != null && exp != null && <StatCell label='LIFETIME' value={lifetime(iat, exp)} />}
              {exp  != null && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--bp-ink-faint)', marginBottom: 4 }}>STATUS</div>
                  <div style={{
                    padding: '3px 10px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: isExp ? '#ff7a85' : '#4ad29a',
                    border: `1px solid ${isExp ? '#ff7a85' : '#4ad29a'}`,
                    background: isExp ? 'rgba(255,122,133,0.08)' : 'rgba(74,210,154,0.08)',
                  }}>
                    {isExp ? 'EXPIRED' : 'VALID'}
                  </div>
                </div>
              )}
              {exp == null && iat == null && (
                <div style={{ padding: '12px 16px', fontSize: 11, color: 'var(--bp-ink-faint)', alignSelf: 'center', letterSpacing: '0.06em' }}>
                  No time claims (iat / exp / nbf) in payload
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ── Empty state ────────────────────────────────────── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--bp-ink-faint)' }}>
            <div style={{ display: 'flex', gap: 6, fontSize: 18, letterSpacing: 2, opacity: 0.4 }}>
              <span style={{ color: ACCENT }}>eyJ•••</span>
              <span>.</span>
              <span style={{ color: P_CLR }}>eyJ•••</span>
              <span>.</span>
              <span style={{ color: S_CLR }}>sig•••</span>
            </div>
            <p style={{ fontSize: 11, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Paste a JWT token above to inspect it</p>
          </div>
        )}
      </div>
    </div>
  );
}
