'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Scan, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { argon2id, argon2i, argon2d } from 'hash-wasm';

type Algorithm = 'bcrypt' | 'argon2id' | 'argon2i' | 'argon2d';
type Tab = 'hash' | 'verify';

interface HashResult { algorithm: Algorithm; hash: string; durationMs: number; }
interface VerifyResult { match: boolean; durationMs: number; }
interface HashOptions { bcryptRounds: number; argon2Iterations: number; argon2Memory: number; argon2Parallelism: number; }

const DEFAULT_OPTIONS: HashOptions = { bcryptRounds: 12, argon2Iterations: 3, argon2Memory: 65536, argon2Parallelism: 4 };

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

function generateSalt(length: number): Uint8Array { return crypto.getRandomValues(new Uint8Array(length)); }

async function hashPassword(password: string, algorithm: Algorithm, options: HashOptions): Promise<HashResult> {
  const start = performance.now();
  let hash: string;
  if (algorithm === 'bcrypt') { const salt = await bcrypt.genSalt(options.bcryptRounds); hash = await bcrypt.hash(password, salt); }
  else {
    const salt = generateSalt(16);
    const params = { password, salt, iterations: options.argon2Iterations, memorySize: options.argon2Memory, parallelism: options.argon2Parallelism, hashLength: 32, outputType: 'encoded' as const };
    if (algorithm === 'argon2id') hash = await argon2id(params);
    else if (algorithm === 'argon2i') hash = await argon2i(params);
    else hash = await argon2d(params);
  }
  return { algorithm, hash, durationMs: Math.round(performance.now() - start) };
}

async function verifyPassword(password: string, hash: string, algorithm: Algorithm): Promise<VerifyResult> {
  const start = performance.now();
  let match: boolean;
  if (algorithm === 'bcrypt') match = await bcrypt.compare(password, hash);
  else { const { argon2Verify } = await import('hash-wasm'); match = await argon2Verify({ password, hash }); }
  return { match, durationMs: Math.round(performance.now() - start) };
}

const algorithms: { value: Algorithm; label: string; desc: string }[] = [
  { value: 'bcrypt', label: 'bcrypt', desc: 'Classic, widely supported' },
  { value: 'argon2id', label: 'Argon2id', desc: 'Recommended (memory + time)' },
  { value: 'argon2i', label: 'Argon2i', desc: 'Side-channel resistant' },
  { value: 'argon2d', label: 'Argon2d', desc: 'GPU resistant' },
];

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

export default function BcryptGeneratorPage() {
  const [tab, setTab] = useState<Tab>('hash');
  const [algorithm, setAlgorithm] = useState<Algorithm>('bcrypt');
  const [password, setPassword] = useState('hunter2');
  const [verifyPassword_, setVerifyPassword_] = useState('');
  const [verifyHash, setVerifyHash] = useState('');
  const [options, setOptions] = useState<HashOptions>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [hashResult, setHashResult] = useState<HashResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleHash = async () => {
    if (!password) { setError('Enter a password'); return; }
    setLoading(true); setError(null); setHashResult(null);
    try { setHashResult(await hashPassword(password, algorithm, options)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Hashing failed'); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!verifyPassword_) { setError('Enter a password'); return; }
    if (!verifyHash) { setError('Enter a hash to verify against'); return; }
    setLoading(true); setError(null); setVerifyResult(null);
    try {
      const algo = verifyHash.startsWith('$2') ? 'bcrypt' : verifyHash.startsWith('$argon2id') ? 'argon2id' : verifyHash.startsWith('$argon2i') ? 'argon2i' : verifyHash.startsWith('$argon2d') ? 'argon2d' : algorithm;
      setVerifyResult(await verifyPassword(verifyPassword_, verifyHash, algo as Algorithm));
    } catch (e) { setError(e instanceof Error ? e.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className='h-full flex flex-col overflow-hidden' data-cat='security' style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}>
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Bcrypt / Argon2 Generator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Generate and verify bcrypt and Argon2 password hashes — all in-browser, nothing leaves your machine</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: 4, width: 'fit-content' }}>
          {(['hash', 'verify'] as Tab[]).map((t) => (
            <button key={t} type='button' onClick={() => { setTab(t); setError(null); setHashResult(null); setVerifyResult(null); }}
              style={{ padding: '4px 16px', fontSize: 11, fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'capitalize', cursor: 'pointer', border: 'none', transition: 'background 0.15s, color 0.15s', background: tab === t ? 'var(--bp-elevated)' : 'transparent', color: tab === t ? '#fff' : 'var(--bp-ink-mute)' }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'hash' && (
          <>
            <Panel title='Algorithm'>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {algorithms.map((a) => (
                    <button key={a.value} type='button' onClick={() => setAlgorithm(a.value)}
                      style={{ textAlign: 'left', padding: '8px 12px', border: `1px solid ${algorithm === a.value ? 'var(--bp-accent)' : 'var(--bp-border)'}`, background: algorithm === a.value ? 'rgba(255,122,133,0.08)' : 'var(--bp-bg)', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{a.label}</p>
                      <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, marginTop: 2 }}>{a.desc}</p>
                    </button>
                  ))}
                </div>
                {algorithm === 'bcrypt' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 6 }}>
                      Cost factor (rounds): <span style={{ color: '#fff' }}>{options.bcryptRounds}</span>
                      <span style={{ color: 'var(--bp-ink-mute)', marginLeft: 8 }}>({Math.pow(2, options.bcryptRounds).toLocaleString()} iterations)</span>
                    </label>
                    <input type='range' min={4} max={16} value={options.bcryptRounds} onChange={(e) => setOptions({ ...options, bcryptRounds: parseInt(e.target.value) })} style={{ width: '100%', accentColor: 'var(--bp-accent)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--bp-ink-mute)', marginTop: 4 }}>
                      <span>4 (fast)</span><span>10 (default)</span><span>16 (slow)</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[{ label: 'Iterations', key: 'argon2Iterations' as const, min: 1, max: 16 }, { label: 'Memory (KB)', key: 'argon2Memory' as const, min: 4096, max: 262144, step: 4096 }, { label: 'Parallelism', key: 'argon2Parallelism' as const, min: 1, max: 8 }].map(({ label, key, min, max, step = 1 }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>{label}</label>
                        <input type='number' value={options[key]} min={min} max={max} step={step} onChange={(e) => setOptions({ ...options, [key]: parseInt(e.target.value) || min })}
                          style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            <Panel title='Password'>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type='text' placeholder='Enter password to hash…'
                  style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleHash()} />
                <button type='button' className='bp-btn bp-btn-solid' onClick={handleHash} disabled={loading || !password} style={{ width: '100%' }}>
                  <Scan className='w-4 h-4 mr-2 inline' />{loading ? 'Hashing…' : `GENERATE ${algorithms.find(a => a.value === algorithm)?.label.toUpperCase()} HASH`}
                </button>
              </div>
            </Panel>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.15)' }}>
                <AlertCircle style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {hashResult && (
              <Panel title={`${algorithms.find(a => a.value === hashResult.algorithm)?.label} Hash`} meta={`Generated in ${hashResult.durationMs}ms`}>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <BpCopyBtn text={hashResult.hash} label='COPY' />
                  </div>
                  <div style={{ background: 'var(--bp-bg)', padding: '10px 14px', fontSize: 11, color: '#4ade80', wordBreak: 'break-all', lineHeight: 1.65 }}>{hashResult.hash}</div>
                  <button type='button' className='bp-btn' onClick={() => { setTab('verify'); setVerifyHash(hashResult.hash); }} style={{ width: '100%' }}>
                    Test this hash in Verify tab →
                  </button>
                </div>
              </Panel>
            )}
          </>
        )}

        {tab === 'verify' && (
          <>
            <Panel title='Verify Password'>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Password</label>
                  <input value={verifyPassword_} onChange={(e) => setVerifyPassword_(e.target.value)} type='text' placeholder='Password to test…'
                    style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4 }}>Hash</label>
                  <textarea value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)} placeholder='$2b$12$… or $argon2id$v=…' rows={4}
                    style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65 }} />
                  <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: '4px 0 0' }}>Algorithm is auto-detected from the hash prefix</p>
                </div>
                <button type='button' className='bp-btn bp-btn-solid' onClick={handleVerify} disabled={loading || !verifyPassword_ || !verifyHash} style={{ width: '100%' }}>
                  <Scan className='w-4 h-4 mr-2 inline' />{loading ? 'Verifying…' : 'VERIFY PASSWORD'}
                </button>
              </div>
            </Panel>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.15)' }}>
                <AlertCircle style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {verifyResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `1px solid ${verifyResult.match ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`, background: verifyResult.match ? 'rgba(20,83,45,0.2)' : 'rgba(127,29,29,0.2)' }}>
                {verifyResult.match
                  ? <CheckCircle style={{ width: 24, height: 24, color: '#4ade80', flexShrink: 0 }} />
                  : <XCircle style={{ width: 24, height: 24, color: '#f87171', flexShrink: 0 }} />}
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: verifyResult.match ? '#4ade80' : '#f87171', margin: 0 }}>{verifyResult.match ? 'Password matches' : 'Password does not match'}</p>
                  <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, marginTop: 2 }}>Verified in {verifyResult.durationMs}ms</p>
                </div>
              </div>
            )}
          </>
        )}

        <Panel title='Algorithm Guide'>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'bcrypt', color: '#60a5fa', text: 'Widely supported, 72-char password limit, cost factor controls speed' },
              { key: 'argon2id', color: '#4ade80', text: 'Winner of Password Hashing Competition. Resistant to both side-channel and GPU attacks. Recommended for new systems' },
              { key: 'argon2i', color: '#facc15', text: 'Optimised against side-channel attacks; prefer argon2id unless you have a specific reason' },
              { key: 'argon2d', color: '#fb923c', text: 'Maximum GPU resistance; vulnerable to side-channel — not suitable for password hashing' },
            ].map(({ key, color, text }) => (
              <div key={key} style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color, width: 72, flexShrink: 0 }}>{key}</span>
                <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>{text}</span>
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}
