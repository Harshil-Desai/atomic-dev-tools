'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Hash } from 'lucide-react';
import CryptoJS from 'crypto-js';

type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';
type OutputFormat = 'hex' | 'base64';

interface HashResult { algorithm: HashAlgorithm; value: string; length: number; }

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#4ad29a',
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

export default function HashGeneratorPage() {
  const [input, setInput] = useState('');
  const [algorithms, setAlgorithms] = useState<HashAlgorithm[]>(['md5', 'sha256']);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('hex');
  const [results, setResults] = useState<HashResult[]>([]);

  const hexStringToByteArray = (hex: string): number[] => {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
    return bytes;
  };

  const generateHash = async (text: string, algorithm: HashAlgorithm, format: OutputFormat): Promise<string> => {
    if (!text) return '';
    let hash: string;
    if (algorithm === 'md5') {
      hash = CryptoJS.MD5(text).toString();
    } else {
      const subtleAlg = algorithm === 'sha1' ? 'SHA-1' : algorithm === 'sha256' ? 'SHA-256' : 'SHA-512';
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const data = new TextEncoder().encode(text);
        const buf = await window.crypto.subtle.digest(subtleAlg, data);
        hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } else {
        hash = (algorithm === 'sha1' ? CryptoJS.SHA1 : algorithm === 'sha256' ? CryptoJS.SHA256 : CryptoJS.SHA512)(text).toString();
      }
    }
    if (format === 'base64') return btoa(String.fromCharCode(...hexStringToByteArray(hash)));
    return hash;
  };

  const handleGenerate = async () => {
    if (!input.trim()) { setResults([]); return; }
    const generated: HashResult[] = [];
    for (const alg of algorithms) {
      const value = await generateHash(input, alg, outputFormat);
      generated.push({ algorithm: alg, value, length: value.length });
    }
    setResults(generated);
  };

  const handleAlgorithmToggle = (algorithm: HashAlgorithm) => {
    setAlgorithms((prev) => prev.includes(algorithm) ? prev.filter((a) => a !== algorithm) : [...prev, algorithm]);
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='data'
      style={{ ...CSS_VARS, background: 'var(--bp-bg)', color: 'var(--bp-ink)', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
    >
      {/* Header */}
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>Hash Generator</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Generate MD5, SHA-1, SHA-256 and SHA-512 digests</p>
      </div>

      {/* Main content */}
      <div className='grid grid-cols-1 lg:grid-cols-2' style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left: Input + Config */}
        <div className='hidden lg:flex' style={{ flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--bp-border)' }}>
          <Panel title='Input Text' style={{ flex: 1, minHeight: 0, border: 0, borderBottom: '1px solid var(--bp-border)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Enter text to hash...'
                spellCheck={false}
                style={{
                  flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0,
                  color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12,
                  padding: '12px 14px', resize: 'none', outline: 'none',
                  boxSizing: 'border-box', lineHeight: 1.65,
                }}
              />
            </div>
          </Panel>

          <Panel title='Configuration' style={{ border: 0, flexShrink: 0 }}>
            <div className='p-3 sm:p-4' style={{ display: 'flex', flexDirection: 'column', gap: 14, color: 'var(--bp-ink)' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Hash Algorithms</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(['md5', 'sha1', 'sha256', 'sha512'] as HashAlgorithm[]).map((alg) => {
                    const checked = algorithms.includes(alg);
                    return (
                      <label
                        key={alg}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 10px', cursor: 'pointer',
                          border: `1px solid ${checked ? 'var(--bp-accent)' : 'var(--bp-border-str)'}`,
                          background: checked ? 'rgba(74,210,154,0.08)' : 'var(--bp-elevated)',
                          fontSize: 11, color: checked ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={() => handleAlgorithmToggle(alg)}
                          style={{ width: 12, height: 12, accentColor: 'var(--bp-accent)' }}
                        />
                        <span style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{alg.toUpperCase()}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Output Format</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['hex', 'base64'] as OutputFormat[]).map((f) => {
                    const active = outputFormat === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setOutputFormat(f)}
                        type='button'
                        style={{
                          padding: '5px 14px', fontSize: 11, cursor: 'pointer',
                          border: `1px solid ${active ? 'var(--bp-accent)' : 'var(--bp-border-str)'}`,
                          background: active ? 'rgba(74,210,154,0.08)' : 'var(--bp-elevated)',
                          color: active ? 'var(--bp-accent)' : 'var(--bp-ink-mute)',
                          fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.05em',
                          outline: 'none',
                        }}
                      >
                        {f === 'hex' ? 'HEX' : 'BASE64'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className='p-2 sm:p-3' style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
              <button
                className='bp-btn bp-btn-solid min-h-10 px-3 py-2'
                onClick={handleGenerate}
                disabled={!input.trim() || algorithms.length === 0}
                type='button'
                style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}
              >
                <Hash style={{ width: 13, height: 13 }} />
                GENERATE HASHES
              </button>
            </div>
          </Panel>
        </div>

        {/* Right: Results */}
        <Panel title='Results' meta={results.length > 0 ? `${results.length} hash${results.length !== 1 ? 'es' : ''}` : undefined} style={{ border: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {results.length > 0 ? (
              <div className='p-3 sm:p-4' style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {results.map((result) => (
                  <div key={result.algorithm}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-accent)' }}>
                        {result.algorithm.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, color: 'var(--bp-ink-faint)' }}>{result.length} chars</span>
                        <BpCopyBtn text={result.value} label='COPY' />
                      </div>
                    </div>
                    <div style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '10px 12px' }}>
                      <pre style={{ margin: 0, fontSize: 11, color: 'var(--bp-ink)', fontFamily: 'inherit', wordBreak: 'break-all', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {result.value}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--bp-ink-faint)' }}>
                <Hash style={{ width: 36, height: 36, opacity: 0.3 }} />
                <span style={{ fontSize: 11 }}>Enter text and generate hashes</span>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
