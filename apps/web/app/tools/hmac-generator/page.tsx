'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

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
    <BpToolStage cat='security'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>HMAC Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate HMAC signatures using the Web Crypto API</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          <BpPanel title='Algorithm & Format'>
            <div className='flex flex-wrap gap-4'>
              <div className='flex-1 min-w-[180px]'>
                <label className='block text-xs text-gray-500 mb-1.5'>Algorithm</label>
                <div className='flex rounded border border-[hsla(0,0%,20%,1)] overflow-hidden'>
                  {(Object.keys(ALGO_LABELS) as HmacAlgorithm[]).map((algo) => (
                    <button key={algo} type='button' onClick={() => setAlgorithm(algo)} className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${algorithm === algo ? 'bg-blue-600 text-white' : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'}`}>
                      {ALGO_LABELS[algo]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1.5'>Output Format</label>
                <div className='flex rounded border border-[hsla(0,0%,20%,1)] overflow-hidden'>
                  {(['hex', 'base64'] as OutputFormat[]).map((fmt) => (
                    <button key={fmt} type='button' onClick={() => setOutputFormat(fmt)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${outputFormat === fmt ? 'bg-blue-600 text-white' : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'}`}>
                      {fmt === 'hex' ? 'Hex' : 'Base64'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </BpPanel>

          <BpPanel title='Message' meta={`${message.length} chars · ${new TextEncoder().encode(message).length} bytes`}>
            <textarea className='bp-textarea font-mono text-sm' placeholder='Enter the message to sign...' value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          </BpPanel>

          <BpPanel title='Secret Key'>
            <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
              <label className='text-xs text-gray-500'>Key Encoding</label>
              <div className='flex rounded border border-[hsla(0,0%,20%,1)] overflow-hidden'>
                {(['utf8', 'hex', 'base64'] as KeyEncoding[]).map((enc) => (
                  <button key={enc} type='button' onClick={() => setKeyEncoding(enc)} className={`px-2.5 py-1 text-xs font-medium transition-colors ${keyEncoding === enc ? 'bg-blue-600 text-white' : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'}`}>
                    {enc === 'utf8' ? 'UTF-8' : enc.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <input type='text' placeholder={keyEncoding === 'hex' ? 'e.g. 0a1b2c3d...' : keyEncoding === 'base64' ? 'e.g. c2VjcmV0...' : 'Enter secret key...'} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className='bp-input w-full font-mono text-sm' spellCheck={false} />
            {keyEncoding !== 'utf8' && <p className='text-xs text-gray-500 mt-1'>{keyEncoding === 'hex' ? 'Hex-encoded key — must be even-length hex digits' : 'Base64-encoded key'}</p>}
          </BpPanel>

          <div className='flex justify-end'>
            <button type='button' className='bp-btn bp-btn-solid' onClick={handleGenerateClick} disabled={!message || !secretKey || loading}>
              {loading ? <><RefreshCw className='w-4 h-4 mr-2 inline animate-spin' />Computing...</> : <><ShieldCheck className='w-4 h-4 mr-2 inline' />GENERATE HMAC</>}
            </button>
          </div>

          {error && (
            <div className='flex items-start gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-4 h-4 text-red-400 flex-shrink-0 mt-0.5' />
              <span className='font-mono text-xs text-red-300'>{error}</span>
            </div>
          )}

          {result && (
            <BpPanel title={`${ALGO_LABELS[algorithm]} (${outputFormat.toUpperCase()})`} meta={byteLength !== null ? `${byteLength} bytes (${byteLength * 8} bits)` : undefined}>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={result} label='COPY' />
              </div>
              <input value={result} readOnly className='bp-input w-full font-mono text-sm tracking-wide bg-[#121212]' />
              <p className='text-xs text-gray-500 mt-1'>{result.length} chars</p>
            </BpPanel>
          )}

          {!result && !error && (!message || !secretKey) && (
            <div className='text-center text-gray-600 py-12'>
              <ShieldCheck className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Enter a message and secret key to generate an HMAC signature</p>
              <p className='text-xs mt-1'>Uses the browser Web Crypto API — nothing leaves your device</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
