'use client';

import { useState, useCallback } from 'react';
import { Unlock, AlertCircle, Eye, EyeOff, Plus } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

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
    <BpToolStage cat='security'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>JWT Generator & Signer</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Build and sign JWT tokens with HMAC — runs entirely in your browser</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Algorithm & Secret'>
            <div className='grid grid-cols-2 gap-4 mb-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Algorithm</label>
                <select value={alg} onChange={(e) => setAlg(e.target.value as 'HS256' | 'HS512')} className='bp-input w-full'>
                  <option value='HS256'>HS256 (HMAC-SHA-256)</option>
                  <option value='HS512'>HS512 (HMAC-SHA-512)</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Header (auto)</label>
                <code className='block text-xs text-gray-400 bp-code-view px-3 py-2 font-mono'>{JSON.stringify(header)}</code>
              </div>
            </div>
            <div>
              <label className='block text-xs text-gray-500 mb-1'>Secret key</label>
              <div className='flex gap-2'>
                <input type={showSecret ? 'text' : 'password'} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder='your-secret-key' className='bp-input font-mono flex-1' />
                <button type='button' className='bp-btn' onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
            </div>
          </BpPanel>

          <BpPanel title='Payload (JSON)'>
            <div className='flex flex-wrap gap-1.5 mb-3'>
              {QUICK_CLAIMS.map((c) => (
                <button key={c.label} type='button' onClick={() => addClaim(c.key, c.value())}
                  className='text-xs px-2 py-0.5 bg-[#121212] border border-[hsla(0,0%,20%,1)] rounded hover:border-white/30 text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1'>
                  <Plus className='w-3 h-3' />{c.label}
                </button>
              ))}
            </div>
            <textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={8} className='bp-textarea font-mono text-sm' spellCheck={false} />
          </BpPanel>

          <button type='button' className='bp-btn bp-btn-solid w-full' onClick={generate} disabled={generating}>
            {generating ? 'Signing…' : 'GENERATE TOKEN'}
          </button>

          {error && (
            <div className='flex items-start gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
              <p className='text-sm text-red-300'>{error}</p>
            </div>
          )}

          {token && (
            <BpPanel title='Signed JWT'>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={token} label='COPY' />
              </div>
              <textarea readOnly value={token} rows={4} className='bp-textarea font-mono text-xs text-green-400 break-all' />
              <p className='text-xs text-gray-500 mt-2'>
                <span className='text-blue-400'>header</span>{' · '}
                <span className='text-purple-400'>payload</span>{' · '}
                <span className='text-green-400'>signature</span>
                {' — separated by dots'}
              </p>
            </BpPanel>
          )}

          <BpPanel title='Decode any JWT'>
            <textarea value={inspectToken} onChange={(e) => setInspectToken(e.target.value)} rows={3} placeholder='Paste a JWT token here…' className='bp-textarea font-mono text-xs mb-3' spellCheck={false} />
            <button type='button' className='bp-btn w-full mb-3' onClick={inspect}>DECODE</button>
            {inspected && (
              <>
                {inspected.error ? (
                  <div className='flex items-start gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'>
                    <AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
                    <p className='text-sm text-red-300'>{inspected.error}</p>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    {([['Header', 'h', inspected.header], ['Payload', 'p', inspected.payload]] as const).map(([title, key, obj]) => (
                      <div key={key} className='bp-code-view rounded p-3'>
                        <div className='flex justify-between items-center mb-2'>
                          <span className='text-xs font-medium text-gray-400 uppercase tracking-wider'>{title}</span>
                          <BpCopyBtn text={JSON.stringify(obj, null, 2)} label='COPY' />
                        </div>
                        <pre className='text-xs text-gray-200 font-mono whitespace-pre-wrap break-all'>{JSON.stringify(obj, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
