'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Scan, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { argon2id, argon2i, argon2d } from 'hash-wasm';

type Algorithm = 'bcrypt' | 'argon2id' | 'argon2i' | 'argon2d';
type Tab = 'hash' | 'verify';

interface HashResult { algorithm: Algorithm; hash: string; durationMs: number; }
interface VerifyResult { match: boolean; durationMs: number; }
interface HashOptions { bcryptRounds: number; argon2Iterations: number; argon2Memory: number; argon2Parallelism: number; }

const DEFAULT_OPTIONS: HashOptions = { bcryptRounds: 12, argon2Iterations: 3, argon2Memory: 65536, argon2Parallelism: 4 };

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
    <BpToolStage cat='security'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Bcrypt / Argon2 Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate and verify bcrypt and Argon2 password hashes — all in-browser, nothing leaves your machine</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-2xl mx-auto space-y-4'>

          <div className='flex gap-1 bg-[#121212] rounded-lg p-1 w-fit'>
            {(['hash', 'verify'] as Tab[]).map((t) => (
              <button key={t} type='button' onClick={() => { setTab(t); setError(null); setHashResult(null); setVerifyResult(null); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'hash' && (
            <>
              <BpPanel title='Algorithm'>
                <div className='grid grid-cols-2 gap-2 mb-4'>
                  {algorithms.map((a) => (
                    <button key={a.value} type='button' onClick={() => setAlgorithm(a.value)}
                      className={`text-left rounded px-3 py-2 border transition-colors ${algorithm === a.value ? 'bg-blue-500/10 border-blue-500/50 text-white' : 'bg-[#121212] border-[hsla(0,0%,20%,1)] text-gray-300 hover:bg-[#1a1a1a]'}`}>
                      <p className='text-sm font-medium font-mono'>{a.label}</p>
                      <p className='text-xs text-gray-500'>{a.desc}</p>
                    </button>
                  ))}
                </div>
                {algorithm === 'bcrypt' ? (
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Cost factor (rounds): <span className='font-mono text-white'>{options.bcryptRounds}</span><span className='text-gray-500 ml-2'>({Math.pow(2, options.bcryptRounds).toLocaleString()} iterations)</span></label>
                    <input type='range' min={4} max={16} value={options.bcryptRounds} onChange={(e) => setOptions({ ...options, bcryptRounds: parseInt(e.target.value) })} className='w-full accent-blue-500' />
                    <div className='flex justify-between text-xs text-gray-500 mt-1'><span>4 (fast)</span><span>10 (default)</span><span>16 (slow)</span></div>
                  </div>
                ) : (
                  <div className='grid grid-cols-3 gap-3'>
                    {[{ label: 'Iterations', key: 'argon2Iterations' as const, min: 1, max: 16 }, { label: 'Memory (KB)', key: 'argon2Memory' as const, min: 4096, max: 262144, step: 4096 }, { label: 'Parallelism', key: 'argon2Parallelism' as const, min: 1, max: 8 }].map(({ label, key, min, max, step = 1 }) => (
                      <div key={key}>
                        <label className='block text-xs text-gray-500 mb-1'>{label}</label>
                        <input type='number' value={options[key]} min={min} max={max} step={step} onChange={(e) => setOptions({ ...options, [key]: parseInt(e.target.value) || min })} className='bp-input w-full font-mono' />
                      </div>
                    ))}
                  </div>
                )}
              </BpPanel>

              <BpPanel title='Password'>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type='text' placeholder='Enter password to hash…' className='bp-input w-full font-mono mb-3' onKeyDown={(e) => e.key === 'Enter' && handleHash()} />
                <button type='button' className='bp-btn bp-btn-solid w-full' onClick={handleHash} disabled={loading || !password}>
                  <Scan className='w-4 h-4 mr-2 inline' />{loading ? 'Hashing…' : `GENERATE ${algorithms.find(a => a.value === algorithm)?.label.toUpperCase()} HASH`}
                </button>
              </BpPanel>

              {error && <div className='flex items-center gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'><AlertCircle className='w-4 h-4 text-red-400 shrink-0' /><span className='text-sm text-red-300'>{error}</span></div>}

              {hashResult && (
                <BpPanel title={`${algorithms.find(a => a.value === hashResult.algorithm)?.label} Hash`} meta={`Generated in ${hashResult.durationMs}ms`}>
                  <div className='bp-panel-actions mb-3'><BpCopyBtn text={hashResult.hash} label='COPY' /></div>
                  <div className='bp-code-view px-4 py-3 font-mono text-xs text-green-400 break-all'>{hashResult.hash}</div>
                  <button type='button' className='bp-btn w-full mt-3' onClick={() => { setTab('verify'); setVerifyHash(hashResult.hash); }}>Test this hash in Verify tab →</button>
                </BpPanel>
              )}
            </>
          )}

          {tab === 'verify' && (
            <>
              <BpPanel title='Verify Password'>
                <div className='space-y-3'>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Password</label>
                    <input value={verifyPassword_} onChange={(e) => setVerifyPassword_(e.target.value)} type='text' placeholder='Password to test…' className='bp-input w-full font-mono' onKeyDown={(e) => e.key === 'Enter' && handleVerify()} />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Hash</label>
                    <textarea value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)} placeholder='$2b$12$… or $argon2id$v=…' rows={4} className='bp-textarea font-mono text-xs' />
                    <p className='text-xs text-gray-500 mt-1'>Algorithm is auto-detected from the hash prefix</p>
                  </div>
                  <button type='button' className='bp-btn bp-btn-solid w-full' onClick={handleVerify} disabled={loading || !verifyPassword_ || !verifyHash}>
                    <Scan className='w-4 h-4 mr-2 inline' />{loading ? 'Verifying…' : 'VERIFY PASSWORD'}
                  </button>
                </div>
              </BpPanel>

              {error && <div className='flex items-center gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'><AlertCircle className='w-4 h-4 text-red-400 shrink-0' /><span className='text-sm text-red-300'>{error}</span></div>}

              {verifyResult && (
                <div className={`flex items-center gap-3 p-4 rounded border ${verifyResult.match ? 'border-green-500/40 bg-green-950/20' : 'border-red-500/40 bg-red-950/20'}`}>
                  {verifyResult.match ? <CheckCircle className='w-6 h-6 text-green-400 shrink-0' /> : <XCircle className='w-6 h-6 text-red-400 shrink-0' />}
                  <div>
                    <p className={`text-lg font-semibold ${verifyResult.match ? 'text-green-400' : 'text-red-400'}`}>{verifyResult.match ? 'Password matches' : 'Password does not match'}</p>
                    <p className='text-xs text-gray-500'>Verified in {verifyResult.durationMs}ms</p>
                  </div>
                </div>
              )}
            </>
          )}

          <BpPanel title='Algorithm Guide'>
            <div className='space-y-2 text-xs text-gray-400'>
              <div className='flex gap-2'><span className='font-mono text-blue-400 w-20 shrink-0'>bcrypt</span><span>Widely supported, 72-char password limit, cost factor controls speed</span></div>
              <div className='flex gap-2'><span className='font-mono text-green-400 w-20 shrink-0'>argon2id</span><span>Winner of Password Hashing Competition. Resistant to both side-channel and GPU attacks. Recommended for new systems</span></div>
              <div className='flex gap-2'><span className='font-mono text-yellow-400 w-20 shrink-0'>argon2i</span><span>Optimised against side-channel attacks; prefer argon2id unless you have a specific reason</span></div>
              <div className='flex gap-2'><span className='font-mono text-orange-400 w-20 shrink-0'>argon2d</span><span>Maximum GPU resistance; vulnerable to side-channel — not suitable for password hashing</span></div>
            </div>
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
