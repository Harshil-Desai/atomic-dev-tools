'use client'
import { useState, useCallback } from 'react';
import { Unlock, Copy, Check, AlertCircle, Eye, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/ui';
import { Card, CardContent } from '@/ui';
import { Input } from '@/ui';
import { Textarea } from '@/ui';

// ── base64url helpers ──────────────────────────────────────────────────────
function b64urlEncode(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = '';
  arr.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlEncodeStr(str: string): string {
  const enc = new TextEncoder().encode(str);
  return b64urlEncode(enc.buffer);
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + ((4 - (s.length % 4)) % 4), '=');
  try { return atob(padded); } catch { return ''; }
}

// ── JWT sign ───────────────────────────────────────────────────────────────
async function signJwt(header: object, payload: object, secret: string, alg: 'HS256' | 'HS512'): Promise<string> {
  const hashAlg = alg === 'HS256' ? 'SHA-256' : 'SHA-512';
  const headerB64 = b64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = b64urlEncodeStr(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyBytes = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: hashAlg },
    false, ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64urlEncode(sigBytes)}`;
}

// ── JWT decode (inspector) ─────────────────────────────────────────────────
function decodeJwt(token: string): { header: object | null; payload: object | null; error?: string } {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return { header: null, payload: null, error: 'Token must have 3 parts separated by dots.' };
  try {
    const header = JSON.parse(b64urlDecode(parts[0]));
    const payload = JSON.parse(b64urlDecode(parts[1]));
    return { header, payload };
  } catch {
    return { header: null, payload: null, error: 'Could not decode — invalid base64url or JSON.' };
  }
}

function nowEpoch() { return Math.floor(Date.now() / 1000); }

const DEFAULT_PAYLOAD = () => ({
  sub: '1234567890',
  name: 'John Doe',
  iat: nowEpoch(),
  exp: nowEpoch() + 3600,
});

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
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Inspector state
  const [inspectToken, setInspectToken] = useState('');
  const [inspected, setInspected] = useState<{ header: object | null; payload: object | null; error?: string } | null>(null);
  const [inspectCopied, setInspectCopied] = useState<'h' | 'p' | null>(null);

  const header = { alg, typ: 'JWT' };

  const generate = useCallback(async () => {
    setError('');
    let payload: object;
    try {
      payload = JSON.parse(payloadText);
    } catch (e: unknown) {
      setError('Payload is not valid JSON: ' + (e instanceof Error ? e.message : String(e)));
      return;
    }
    if (!secret) { setError('Secret key is required.'); return; }
    setGenerating(true);
    try {
      const jwt = await signJwt(header, payload, secret, alg);
      setToken(jwt);
    } catch (e: unknown) {
      setError('Signing failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGenerating(false);
    }
  }, [payloadText, secret, alg]);

  const copy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addClaim = (key: string, value: string | number) => {
    try {
      const obj = JSON.parse(payloadText);
      obj[key] = value;
      setPayloadText(JSON.stringify(obj, null, 2));
    } catch { /* leave as-is */ }
  };

  const inspect = () => {
    if (!inspectToken.trim()) { setInspected(null); return; }
    setInspected(decodeJwt(inspectToken));
  };

  const copyInspect = (part: 'h' | 'p', obj: object | null) => {
    if (!obj) return;
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setInspectCopied(part);
    setTimeout(() => setInspectCopied(null), 2000);
  };

  const fmtJson = (obj: object | null) =>
    obj ? JSON.stringify(obj, null, 2) : '';

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2'>
          <Unlock className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>JWT Generator & Signer</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
          Build and sign JWT tokens with HMAC — runs entirely in your browser
        </p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          {/* Algorithm + Secret */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-foreground mb-1'>Algorithm</label>
                  <select
                    value={alg}
                    onChange={(e) => setAlg(e.target.value as 'HS256' | 'HS512')}
                    className='w-full bg-[#1C1C1C] border border-border text-foreground text-sm rounded-md px-3 py-2'
                  >
                    <option value='HS256'>HS256 (HMAC-SHA-256)</option>
                    <option value='HS512'>HS512 (HMAC-SHA-512)</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-foreground mb-1'>Header (auto)</label>
                  <code className='block text-xs text-muted-foreground bg-[#121212] border border-border rounded px-3 py-2 font-mono'>
                    {JSON.stringify(header)}
                  </code>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-foreground mb-1'>Secret key</label>
                <div className='flex gap-2'>
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder='your-secret-key'
                    className='font-mono flex-1'
                  />
                  <Button variant='outline' size='icon' onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payload */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium text-foreground'>Payload (JSON)</label>
                <div className='flex flex-wrap gap-1.5'>
                  {QUICK_CLAIMS.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => addClaim(c.key, c.value())}
                      className='text-xs px-2 py-0.5 bg-[#1C1C1C] border border-border rounded hover:border-white/30 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1'
                    >
                      <Plus className='w-3 h-3' />{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                rows={8}
                className='font-mono text-sm bg-[#121212]'
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* Generate */}
          <Button onClick={generate} disabled={generating} className='w-full'>
            {generating ? 'Signing…' : 'Generate Token'}
          </Button>

          {error && (
            <div className='flex items-start gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-md'>
              <AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
              <p className='text-sm text-red-300'>{error}</p>
            </div>
          )}

          {token && (
            <Card>
              <CardContent className='pt-6 space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-foreground'>Signed JWT</span>
                  <Button variant='outline' size='sm' onClick={copy} className='gap-1.5'>
                    {copied ? <Check className='w-3.5 h-3.5 text-green-400' /> : <Copy className='w-3.5 h-3.5' />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={token}
                  rows={4}
                  className='font-mono text-xs bg-[#121212] text-green-400 break-all'
                />
                <p className='text-xs text-muted-foreground'>
                  <span className='text-blue-400'>header</span>
                  {' · '}
                  <span className='text-purple-400'>payload</span>
                  {' · '}
                  <span className='text-green-400'>signature</span>
                  {' — separated by dots'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Inspector */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <p className='text-sm font-medium text-foreground'>Decode any JWT</p>
              <Textarea
                value={inspectToken}
                onChange={(e) => setInspectToken(e.target.value)}
                rows={3}
                placeholder='Paste a JWT token here…'
                className='font-mono text-xs bg-[#121212]'
                spellCheck={false}
              />
              <Button variant='outline' onClick={inspect} className='w-full'>Decode</Button>

              {inspected && (
                <>
                  {inspected.error ? (
                    <div className='flex items-start gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-md'>
                      <AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
                      <p className='text-sm text-red-300'>{inspected.error}</p>
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      {([['Header', 'h', inspected.header], ['Payload', 'p', inspected.payload]] as const).map(([title, key, obj]) => (
                        <div key={key} className='bg-[#121212] border border-border rounded p-3'>
                          <div className='flex justify-between items-center mb-2'>
                            <span className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>{title}</span>
                            <button onClick={() => copyInspect(key as 'h' | 'p', obj)}>
                              {inspectCopied === key ? <Check className='w-3.5 h-3.5 text-green-400' /> : <Copy className='w-3.5 h-3.5 text-muted-foreground hover:text-foreground' />}
                            </button>
                          </div>
                          <pre className='text-xs text-foreground font-mono whitespace-pre-wrap break-all'>{fmtJson(obj)}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
