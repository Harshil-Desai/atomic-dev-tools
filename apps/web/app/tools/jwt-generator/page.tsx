'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, Eye, EyeOff, Plus } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

function b64urlEncode(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = '';
  arr.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlEncodeStr(str: string): string { return b64urlEncode(new TextEncoder().encode(str).buffer); }

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + ((4 - (s.length % 4)) % 4), '=');
  try { return atob(padded); } catch { return ''; }
}

async function signJwt(header: object, payload: object, secret: string, alg: 'HS256' | 'HS512'): Promise<string> {
  const hashAlg = alg === 'HS256' ? 'SHA-256' : 'SHA-512';
  const headerB64 = b64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = b64urlEncodeStr(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const keyBytes = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: hashAlg }, false, ['sign']);
  const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64urlEncode(sigBytes)}`;
}

function decodeJwt(token: string): { header: object | null; payload: object | null; error?: string } {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return { header: null, payload: null, error: 'Token must have 3 parts separated by dots.' };
  try { return { header: JSON.parse(b64urlDecode(parts[0])), payload: JSON.parse(b64urlDecode(parts[1])) }; }
  catch { return { header: null, payload: null, error: 'Could not decode — invalid base64url or JSON.' }; }
}

function nowEpoch() { return Math.floor(Date.now() / 1000); }

const DEFAULT_PAYLOAD = () => ({ sub: '1234567890', name: 'John Doe', iat: nowEpoch(), exp: nowEpoch() + 3600 });

const QUICK_CLAIMS: { label: string; key: string; value: () => string | number }[] = [
  { label: 'iss', key: 'iss', value: () => 'https://example.com' },
  { label: 'aud', key: 'aud', value: () => 'my-app' },
  { label: 'jti', key: 'jti', value: () => crypto.randomUUID() },
  { label: '+1h exp', key: 'exp', value: () => nowEpoch() + 3600 },
  { label: '+24h exp', key: 'exp', value: () => nowEpoch() + 86400 },
];

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#ff7a85',
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

export default function JwtGeneratorPage() {
  const [alg, setAlg] = useState<'HS256' | 'HS512'>('HS256');
  const [secret, setSecret] = useState('your-256-bit-secret');
  const [showSecret, setShowSecret] = useState(false);
  const [payloadText, setPayloadText] = useState(JSON.stringify(DEFAULT_PAYLOAD(), null, 2));
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [inspectToken, setInspectToken] = useState('');
  const [inspected, setInspected] = useState<{ header: object | null; payload: object | null; error?: string } | null>(null);

  const header = { alg, typ: 'JWT' };

  const generate = useCallback(async () => {
    setError('');
    let payload: object;
    try { payload = JSON.parse(payloadText); }
    catch (e: unknown) { setError('Payload is not valid JSON: ' + (e instanceof Error ? e.message : String(e))); return; }
    if (!secret) { setError('Secret key is required.'); return; }
    setGenerating(true);
    try { setToken(await signJwt(header, payload, secret, alg)); }
    catch (e: unknown) { setError('Signing failed: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setGenerating(false); }
  }, [payloadText, secret, alg]);

  const addClaim = (key: string, value: string | number) => {
    try { const obj = JSON.parse(payloadText); obj[key] = value; setPayloadText(JSON.stringify(obj, null, 2)); } catch { }
  };

  const inspect = () => { if (!inspectToken.trim()) { setInspected(null); return; } setInspected(decodeJwt(inspectToken)); };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='security'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>JWT Generator & Signer</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Build and sign JWT tokens with HMAC — runs entirely in your browser</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* Left column: config + payload */}
        <Panel title='Sign' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Algorithm & Secret */}
            <div style={{ borderBottom: '1px solid var(--bp-border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Algorithm</div>
                  <select
                    value={alg}
                    onChange={(e) => setAlg(e.target.value as 'HS256' | 'HS512')}
                    style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '5px 8px', outline: 'none', width: '100%' }}
                  >
                    <option value='HS256'>HS256 (HMAC-SHA-256)</option>
                    <option value='HS512'>HS512 (HMAC-SHA-512)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Header (auto)</div>
                  <code style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '5px 8px', fontFamily: 'inherit' }}>{JSON.stringify(header)}</code>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Secret key</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder='your-secret-key'
                    style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type='button' className='bp-btn' onClick={() => setShowSecret(!showSecret)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showSecret ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick claims + Payload textarea */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Quick claims</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {QUICK_CLAIMS.map((c) => (
                  <button
                    key={c.label}
                    type='button'
                    onClick={() => addClaim(c.key, c.value())}
                    className='bp-btn'
                    style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <Plus className='w-3 h-3' />{c.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              spellCheck={false}
              style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0, color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65, minHeight: 200 }}
            />

          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button
              type='button'
              className='bp-btn bp-btn-solid'
              onClick={generate}
              disabled={generating}
              style={{ flex: 1 }}
            >
              {generating ? 'Signing…' : 'GENERATE TOKEN'}
            </button>
          </div>
        </Panel>

        {/* Right column: output + decode */}
        <Panel title='Output' style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Error */}
            {error && (
              <div style={{ margin: '10px 12px', padding: '8px 10px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {/* Signed JWT */}
            {token && (
              <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--bp-border)' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Signed JWT</span>
                  <BpCopyBtn text={token} label='COPY' />
                </div>
                <textarea
                  readOnly
                  value={token}
                  rows={4}
                  style={{ width: '100%', background: 'var(--bp-bg)', border: 0, color: '#4ade80', fontFamily: 'inherit', fontSize: 11, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65, wordBreak: 'break-all' }}
                />
                <div style={{ padding: '4px 12px 8px', fontSize: 10, color: 'var(--bp-ink-mute)' }}>
                  <span style={{ color: '#60a5fa' }}>header</span>{' · '}
                  <span style={{ color: '#c084fc' }}>payload</span>{' · '}
                  <span style={{ color: '#4ade80' }}>signature</span>
                  {' — separated by dots'}
                </div>
              </div>
            )}

            {/* Decode section */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Decode any JWT</div>
                <textarea
                  value={inspectToken}
                  onChange={(e) => setInspectToken(e.target.value)}
                  rows={3}
                  placeholder='Paste a JWT token here…'
                  spellCheck={false}
                  style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '8px 10px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65 }}
                />
                <button type='button' className='bp-btn' onClick={inspect} style={{ marginTop: 6, width: '100%' }}>DECODE</button>
              </div>

              {inspected && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {inspected.error ? (
                    <div style={{ padding: '8px 10px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12, color: '#fca5a5' }}>{inspected.error}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {([['Header', 'h', inspected.header], ['Payload', 'p', inspected.payload]] as const).map(([title, key, obj]) => (
                        <div key={key} style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', fontWeight: 600 }}>{title}</span>
                            <BpCopyBtn text={JSON.stringify(obj, null, 2)} label='COPY' />
                          </div>
                          <pre style={{ fontSize: 10, color: 'var(--bp-ink)', fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{JSON.stringify(obj, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </Panel>

      </div>
    </div>
  );
}
