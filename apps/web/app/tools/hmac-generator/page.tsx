'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

type HmacAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';
type KeyEncoding = 'utf8' | 'hex' | 'base64';
type OutputFormat = 'hex' | 'base64';

const ALGO_LABELS: Record<HmacAlgorithm, string> = { 'SHA-1': 'HMAC-SHA-1', 'SHA-256': 'HMAC-SHA-256', 'SHA-512': 'HMAC-SHA-512' };

function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/\s/g, '');
  if (cleaned.length % 2 !== 0) throw new Error('Invalid hex string: odd length');
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) throw new Error('Invalid hex string: non-hex characters');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array {
  try { const binary = atob(b64.trim()); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; }
  catch { throw new Error('Invalid Base64 string'); }
}

function bytesToHex(bytes: Uint8Array): string { return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''); }
function bytesToBase64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }

async function computeHmac(algorithm: HmacAlgorithm, keyBytes: Uint8Array, messageBytes: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await window.crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'HMAC', hash: { name: algorithm } }, false, ['sign']);
  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageBytes.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

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

export default function HmacGeneratorPage() {
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>('SHA-256');
  const [message, setMessage] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [keyEncoding, setKeyEncoding] = useState<KeyEncoding>('utf8');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('hex');
  const [result, setResult] = useState('');
  const [byteLength, setByteLength] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = useCallback(async (algo: HmacAlgorithm, msg: string, key: string, keyEnc: KeyEncoding, outFmt: OutputFormat) => {
    if (!msg || !key) { setResult(''); setByteLength(null); setError(null); return; }
    setLoading(true); setError(null);
    try {
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(msg);
      let keyBytes: Uint8Array;
      if (keyEnc === 'utf8') keyBytes = encoder.encode(key);
      else if (keyEnc === 'hex') keyBytes = hexToBytes(key);
      else keyBytes = base64ToBytes(key);
      const sigBytes = await computeHmac(algo, keyBytes, messageBytes);
      setByteLength(sigBytes.length);
      setResult(outFmt === 'hex' ? bytesToHex(sigBytes) : bytesToBase64(sigBytes));
    } catch (e) { setError(e instanceof Error ? e.message : 'HMAC computation failed'); setResult(''); setByteLength(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(algorithm, message, secretKey, keyEncoding, outputFormat), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [algorithm, message, secretKey, keyEncoding, outputFormat, generate]);

  const handleGenerateClick = () => { if (debounceRef.current) clearTimeout(debounceRef.current); generate(algorithm, message, secretKey, keyEncoding, outputFormat); };

  return (
    <div className='h-full flex flex-col overflow-hidden' data-cat='security' style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}>
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>HMAC Generator</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Compute HMAC-SHA1, SHA-256 and SHA-512 message authentication codes</p>
      </div>

      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden' style={{}}>
        {/* Left column: inputs */}
        <Panel title='Inputs' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Algorithm & Format controls */}
            <div className='p-2 sm:p-3' style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Algorithm</div>
                  <div style={{ display: 'flex', border: '1px solid var(--bp-border)', overflow: 'hidden' }}>
                    {(Object.keys(ALGO_LABELS) as HmacAlgorithm[]).map((algo) => (
                      <button key={algo} type='button' onClick={() => setAlgorithm(algo)} className='flex-1 min-h-10 px-3 py-2'
                        style={{ fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', border: 0, background: algorithm === algo ? 'var(--bp-accent)' : 'var(--bp-surface)', color: algorithm === algo ? '#fff' : 'var(--bp-ink-mute)', transition: 'background 0.15s, color 0.15s' }}>
                        {ALGO_LABELS[algo]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Output Format</div>
                  <div style={{ display: 'flex', border: '1px solid var(--bp-border)', overflow: 'hidden' }}>
                    {(['hex', 'base64'] as OutputFormat[]).map((fmt) => (
                      <button key={fmt} type='button' onClick={() => setOutputFormat(fmt)} className='min-h-10 px-3 py-2'
                        style={{ fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', border: 0, background: outputFormat === fmt ? 'var(--bp-accent)' : 'var(--bp-surface)', color: outputFormat === fmt ? '#fff' : 'var(--bp-ink-mute)', transition: 'background 0.15s, color 0.15s' }}>
                        {fmt === 'hex' ? 'Hex' : 'Base64'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Message</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--bp-ink-faint)' }}>
                  {message.length} chars · {new TextEncoder().encode(message).length} bytes
                </span>
              </div>
              <textarea
                placeholder='Enter the message to sign...'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0, color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65, minHeight: 140 }}
              />
            </div>

            {/* Secret Key */}
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--bp-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Secret Key</span>
                <div style={{ marginLeft: 'auto', display: 'flex', border: '1px solid var(--bp-border)', overflow: 'hidden' }}>
                  {(['utf8', 'hex', 'base64'] as KeyEncoding[]).map((enc) => (
                    <button key={enc} type='button' onClick={() => setKeyEncoding(enc)} className='min-h-10 px-3 py-2'
                      style={{ fontSize: 9, fontFamily: 'inherit', cursor: 'pointer', border: 0, background: keyEncoding === enc ? 'var(--bp-accent)' : 'var(--bp-surface)', color: keyEncoding === enc ? '#fff' : 'var(--bp-ink-mute)', transition: 'background 0.15s, color 0.15s' }}>
                      {enc === 'utf8' ? 'UTF-8' : enc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <input
                  type='text'
                  placeholder={keyEncoding === 'hex' ? 'e.g. 0a1b2c3d...' : keyEncoding === 'base64' ? 'e.g. c2VjcmV0...' : 'Enter secret key...'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  spellCheck={false}
                  style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                />
                {keyEncoding !== 'utf8' && (
                  <p style={{ fontSize: 9, color: 'var(--bp-ink-faint)', margin: '5px 0 0 0' }}>
                    {keyEncoding === 'hex' ? 'Hex-encoded key — must be even-length hex digits' : 'Base64-encoded key'}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Action bar */}
          <div className='flex items-center gap-2 sm:gap-3 p-2 sm:p-3' style={{ borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button type='button' className='bp-btn bp-btn-solid min-h-10 px-3 py-2' onClick={handleGenerateClick} disabled={!message || !secretKey || loading}>
              {loading ? <><RefreshCw className='w-4 h-4 mr-2 inline animate-spin' />Computing...</> : <><ShieldCheck className='w-4 h-4 mr-2 inline' />GENERATE HMAC</>}
            </button>
          </div>
        </Panel>

        {/* Right column: output */}
        <Panel
          title={result ? `${ALGO_LABELS[algorithm]} (${outputFormat.toUpperCase()})` : 'Output'}
          meta={result && byteLength !== null ? `${byteLength} bytes (${byteLength * 8} bits)` : undefined}
          style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}
        >
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <div style={{ margin: 12, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.2)' }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: 'inherit', fontSize: 11, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 12, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BpCopyBtn text={result} label='COPY' />
                  <span style={{ fontSize: 9, color: 'var(--bp-ink-faint)' }}>{result.length} chars</span>
                </div>
                <input
                  value={result}
                  readOnly
                  style={{ width: '100%', background: 'var(--bp-surface)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '7px 10px', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.05em' }}
                />
              </div>
            )}

            {!result && !error && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--bp-ink-faint)', padding: 24 }}>
                <ShieldCheck style={{ width: 36, height: 36, opacity: 0.3 }} />
                <p style={{ fontSize: 11, margin: 0, textAlign: 'center' }}>Enter a message and secret key to generate an HMAC signature</p>
                <p style={{ fontSize: 10, margin: 0, textAlign: 'center', color: 'var(--bp-ink-faint)' }}>Uses the browser Web Crypto API — nothing leaves your device</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
