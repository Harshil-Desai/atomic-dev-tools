'use client';

import { useState } from 'react';
import { Key, Copy, Check, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, Textarea } from '@/ui';

// base64url → base64 standard → atob
function base64urlDecode(str: string): string {
  // Replace base64url chars with standard base64
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to multiple of 4
  while (s.length % 4 !== 0) s += '=';
  return atob(s);
}

interface JWTHeader {
  alg?: string;
  typ?: string;
  [key: string]: unknown;
}

interface JWTPayload {
  exp?: number;
  iat?: number;
  nbf?: number;
  [key: string]: unknown;
}

interface ParsedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  headerRaw: string;
  payloadRaw: string;
}

function parseJWT(token: string): ParsedJWT {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 dot-separated parts (header.payload.signature).');
  }
  const [headerB64, payloadB64] = parts;

  let header: JWTHeader;
  let payload: JWTPayload;

  try {
    header = JSON.parse(base64urlDecode(headerB64));
  } catch {
    throw new Error('Invalid JWT: could not decode header. Make sure the token is base64url-encoded JSON.');
  }

  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch {
    throw new Error('Invalid JWT: could not decode payload. Make sure the token is base64url-encoded JSON.');
  }

  return {
    header,
    payload,
    headerRaw: JSON.stringify(header, null, 2),
    payloadRaw: JSON.stringify(payload, null, 2),
  };
}

// Simple syntax highlighter — wraps keys, strings, numbers, booleans in colored spans
function syntaxHighlight(json: string): string {
  // Escape HTML special chars first
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // Key
          return `<span style="color:#7dd3fc">${match}</span>`;
        }
        // String value
        return `<span style="color:#86efac">${match}</span>`;
      }
      if (/true|false/.test(match)) {
        return `<span style="color:#fbbf24">${match}</span>`;
      }
      if (/null/.test(match)) {
        return `<span style="color:#f87171">${match}</span>`;
      }
      // Number
      return `<span style="color:#c084fc">${match}</span>`;
    },
  );
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

function expiryStatus(exp: number): { label: string; color: string } {
  const nowMs = Date.now();
  const expMs = exp * 1000;
  const diffMs = expMs - nowMs;
  const absSec = Math.abs(Math.floor(diffMs / 1000));

  if (diffMs < 0) {
    // Expired
    const mins = Math.floor(absSec / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    let ago: string;
    if (days > 0) ago = `${days}d ${hours % 24}h ago`;
    else if (hours > 0) ago = `${hours}h ${mins % 60}m ago`;
    else if (mins > 0) ago = `${mins}m ${absSec % 60}s ago`;
    else ago = `${absSec}s ago`;
    return { label: `Expired ${ago}`, color: 'text-red-400' };
  }

  const mins = Math.floor(absSec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  let remaining: string;
  if (days > 0) remaining = `${days}d ${hours % 24}h remaining`;
  else if (hours > 0) remaining = `${hours}h ${mins % 60}m remaining`;
  else if (mins > 0) remaining = `${mins}m ${absSec % 60}s remaining`;
  else remaining = `${absSec}s remaining`;
  return { label: `Valid — ${remaining}`, color: 'text-green-400' };
}

export default function JWTInspectorPage() {
  const [token, setToken] = useState('');
  const [parsed, setParsed] = useState<ParsedJWT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const handleTokenChange = (value: string) => {
    setToken(value);
    if (!value.trim()) {
      setParsed(null);
      setError(null);
      return;
    }
    try {
      const result = parseJWT(value);
      setParsed(result);
      setError(null);
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : 'Failed to parse JWT.');
    }
  };

  const copyText = async (text: string, which: 'header' | 'payload') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'header') {
        setCopiedHeader(true);
        setTimeout(() => setCopiedHeader(false), 2000);
      } else {
        setCopiedPayload(true);
        setTimeout(() => setCopiedPayload(false), 2000);
      }
    } catch {
      // ignore clipboard errors
    }
  };

  const expiry = parsed?.payload.exp != null ? expiryStatus(parsed.payload.exp) : null;

  const timeClaimRows: Array<{ key: string; value: number }> = [];
  if (parsed) {
    if (parsed.payload.iat != null) timeClaimRows.push({ key: 'iat (issued at)', value: parsed.payload.iat });
    if (parsed.payload.nbf != null) timeClaimRows.push({ key: 'nbf (not before)', value: parsed.payload.nbf });
    if (parsed.payload.exp != null) timeClaimRows.push({ key: 'exp (expires at)', value: parsed.payload.exp });
  }

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2 mb-1'>
          <Key className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>JWT Inspector</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground'>
          Decode and inspect JWT tokens — header, payload, algorithm, and expiry status
        </p>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <label className='block text-sm font-medium text-gray-300'>Paste JWT Token</label>
              <Textarea
                placeholder='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
                value={token}
                onChange={(e) => handleTokenChange(e.target.value)}
                rows={4}
                className='font-mono text-xs break-all'
              />
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className='border-red-900 bg-red-950/30'>
              <CardContent className='pt-5'>
                <div className='flex items-start gap-3'>
                  <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='text-sm font-semibold text-red-400 mb-1'>Invalid JWT</p>
                    <p className='text-xs text-red-300'>{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {parsed && (
            <>
              {/* Algorithm + Expiry status */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <Card>
                  <CardContent className='pt-5'>
                    <p className='text-xs text-muted-foreground mb-1'>Algorithm</p>
                    <p className='text-lg font-mono font-semibold text-foreground'>
                      {parsed.header.alg ?? 'N/A'}
                    </p>
                    {parsed.header.typ && (
                      <p className='text-xs text-muted-foreground mt-1'>Type: {parsed.header.typ}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='pt-5'>
                    <p className='text-xs text-muted-foreground mb-1'>Expiry</p>
                    {expiry ? (
                      <p className={`text-sm font-medium ${expiry.color}`}>{expiry.label}</p>
                    ) : (
                      <p className='text-sm text-muted-foreground'>No exp claim present</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Time claims */}
              {timeClaimRows.length > 0 && (
                <Card>
                  <CardContent className='pt-5 space-y-3'>
                    <p className='text-sm font-medium text-gray-300'>Time Claims</p>
                    <div className='space-y-2'>
                      {timeClaimRows.map(({ key, value }) => (
                        <div key={key} className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs'>
                          <span className='font-mono text-blue-300 w-40 flex-shrink-0'>{key}</span>
                          <span className='font-mono text-purple-300'>{value}</span>
                          <span className='text-muted-foreground'>{formatTimestamp(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Header JSON */}
              <Card>
                <CardContent className='pt-5 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium text-gray-300'>Header</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => copyText(parsed.headerRaw, 'header')}
                    >
                      {copiedHeader ? (
                        <><Check className='w-4 h-4 mr-1.5' />Copied</>
                      ) : (
                        <><Copy className='w-4 h-4 mr-1.5' />Copy</>
                      )}
                    </Button>
                  </div>
                  <pre
                    className='bg-[#0d0d0d] rounded-md p-4 text-xs font-mono overflow-x-auto leading-relaxed'
                    dangerouslySetInnerHTML={{ __html: syntaxHighlight(parsed.headerRaw) }}
                  />
                </CardContent>
              </Card>

              {/* Payload JSON */}
              <Card>
                <CardContent className='pt-5 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium text-gray-300'>Payload</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => copyText(parsed.payloadRaw, 'payload')}
                    >
                      {copiedPayload ? (
                        <><Check className='w-4 h-4 mr-1.5' />Copied</>
                      ) : (
                        <><Copy className='w-4 h-4 mr-1.5' />Copy</>
                      )}
                    </Button>
                  </div>
                  <pre
                    className='bg-[#0d0d0d] rounded-md p-4 text-xs font-mono overflow-x-auto leading-relaxed'
                    dangerouslySetInnerHTML={{ __html: syntaxHighlight(parsed.payloadRaw) }}
                  />
                </CardContent>
              </Card>

              {/* Signature note */}
              <Card className='border-dashed'>
                <CardContent className='pt-5'>
                  <p className='text-xs text-muted-foreground'>
                    <span className='font-semibold text-gray-400'>Signature:</span> The signature is not verified here — this tool only base64url-decodes the header and payload for inspection. To verify the signature, provide the secret/key in a dedicated JWT verification tool.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {!token && !error && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-10'>
                  <Key className='w-10 h-10 mx-auto mb-3 opacity-40' />
                  <p className='text-sm'>Paste a JWT token above to inspect it</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
