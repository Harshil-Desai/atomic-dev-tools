'use client';

import { useState } from 'react';
import { Key, AlertCircle } from 'lucide-react';
import { BpPanel, BpToolStage, BpStat, BpStatus, BpCopyBtn } from '@/components/blueprint';

function base64urlDecode(str: string): string {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  return atob(s);
}

interface JWTHeader { alg?: string; typ?: string; [key: string]: unknown; }
interface JWTPayload { exp?: number; iat?: number; nbf?: number; [key: string]: unknown; }
interface ParsedJWT { header: JWTHeader; payload: JWTPayload; headerRaw: string; payloadRaw: string; }

function parseJWT(token: string): ParsedJWT {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT: expected 3 dot-separated parts.');
  const header = JSON.parse(base64urlDecode(parts[0]));
  const payload = JSON.parse(base64urlDecode(parts[1]));
  return { header, payload, headerRaw: JSON.stringify(header, null, 2), payloadRaw: JSON.stringify(payload, null, 2) };
}

function formatTimestamp(unix: number): string { return new Date(unix * 1000).toISOString(); }

function expiryStatus(exp: number): { label: string; state: 'ok' | 'fail' } {
  const diff = exp * 1000 - Date.now();
  if (diff < 0) return { label: 'Expired', state: 'fail' };
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `Valid — ${days}d ${hours % 24}h remaining` : hours > 0 ? `Valid — ${hours}h ${mins % 60}m remaining` : `Valid — ${mins}m remaining`;
  return { label, state: 'ok' };
}

export default function JWTInspectorPage() {
  const [token, setToken] = useState('');
  const [parsed, setParsed] = useState<ParsedJWT | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTokenChange = (value: string) => {
    setToken(value);
    if (!value.trim()) { setParsed(null); setError(null); return; }
    try { setParsed(parseJWT(value)); setError(null); }
    catch (e) { setParsed(null); setError(e instanceof Error ? e.message : 'Failed to parse JWT.'); }
  };

  const expiry = parsed?.payload.exp != null ? expiryStatus(parsed.payload.exp) : null;

  return (
    <BpToolStage cat='api'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2 mb-1'>
          <Key className='w-4 h-4 text-gray-400' />
          <h1 className='text-xl sm:text-2xl font-bold text-white'>JWT Inspector</h1>
        </div>
        <p className='text-xs sm:text-sm text-gray-400'>Decode and inspect JWT tokens — header, payload, algorithm, expiry</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-3'>
          <BpPanel title='TOKEN INPUT'>
            <textarea
              className='bp-textarea w-full'
              rows={4}
              placeholder='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
            />
          </BpPanel>

          {error && (
            <BpPanel title='ERROR'>
              <div className='flex items-start gap-2 text-red-400'>
                <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
                <span className='text-xs font-mono'>{error}</span>
              </div>
            </BpPanel>
          )}

          {parsed && (
            <>
              <div className='bp-layout-2col'>
                <BpPanel title='ALGORITHM'>
                  <BpStat label='alg' value={<span className='text-white font-bold'>{parsed.header.alg ?? 'N/A'}</span>} />
                  {parsed.header.typ && <BpStat label='typ' value={parsed.header.typ as string} />}
                </BpPanel>
                <BpPanel title='EXPIRY'>
                  {expiry
                    ? <BpStatus state={expiry.state}>{expiry.label}</BpStatus>
                    : <span className='text-xs font-mono text-gray-500'>No exp claim</span>}
                </BpPanel>
              </div>

              {(['iat', 'nbf', 'exp'] as const).some((k) => parsed.payload[k] != null) && (
                <BpPanel title='TIME CLAIMS'>
                  {(['iat', 'nbf', 'exp'] as const).filter((k) => parsed.payload[k] != null).map((k) => (
                    <BpStat key={k} label={k} value={<>
                      <span className='text-purple-300'>{String(parsed.payload[k])}</span>
                      <span className='text-gray-500 ml-2'>{formatTimestamp(parsed.payload[k] as number)}</span>
                    </>} />
                  ))}
                </BpPanel>
              )}

              <div className='bp-layout-2col'>
                <BpPanel title='HEADER'>
                  <div className='flex justify-end mb-2'><BpCopyBtn text={parsed.headerRaw} /></div>
                  <pre className='text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-48'>{parsed.headerRaw}</pre>
                </BpPanel>
                <BpPanel title='PAYLOAD'>
                  <div className='flex justify-end mb-2'><BpCopyBtn text={parsed.payloadRaw} /></div>
                  <pre className='text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-48'>{parsed.payloadRaw}</pre>
                </BpPanel>
              </div>

              <BpPanel title='NOTE'>
                <p className='text-xs font-mono text-gray-500'>Signature is not verified here — this tool only base64url-decodes header and payload for inspection.</p>
              </BpPanel>
            </>
          )}

          {!token && (
            <BpPanel title='IDLE'>
              <div className='text-center py-10 text-gray-600'>
                <Key className='w-10 h-10 mx-auto mb-3 opacity-30' />
                <p className='text-sm font-mono'>Paste a JWT token above to inspect it</p>
              </div>
            </BpPanel>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
