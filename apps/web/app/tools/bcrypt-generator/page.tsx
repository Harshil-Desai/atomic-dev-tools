'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { Scan, Copy, Check, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { argon2id, argon2i, argon2d } from 'hash-wasm';

// ─── types ────────────────────────────────────────────────────────────────────

type Algorithm = 'bcrypt' | 'argon2id' | 'argon2i' | 'argon2d';
type Tab = 'hash' | 'verify';

interface HashResult {
  algorithm: Algorithm;
  hash: string;
  durationMs: number;
}

interface VerifyResult {
  match: boolean;
  durationMs: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateSalt(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function hashPassword(password: string, algorithm: Algorithm, options: HashOptions): Promise<HashResult> {
  const start = performance.now();
  let hash: string;

  if (algorithm === 'bcrypt') {
    const salt = await bcrypt.genSalt(options.bcryptRounds);
    hash = await bcrypt.hash(password, salt);
  } else {
    const salt = generateSalt(16);
    const params = {
      password,
      salt,
      iterations: options.argon2Iterations,
      memorySize: options.argon2Memory,
      parallelism: options.argon2Parallelism,
      hashLength: 32,
      outputType: 'encoded' as const,
    };
    if (algorithm === 'argon2id') hash = await argon2id(params);
    else if (algorithm === 'argon2i') hash = await argon2i(params);
    else hash = await argon2d(params);
  }

  return { algorithm, hash, durationMs: Math.round(performance.now() - start) };
}

async function verifyPassword(password: string, hash: string, algorithm: Algorithm): Promise<VerifyResult> {
  const start = performance.now();
  let match: boolean;

  if (algorithm === 'bcrypt') {
    match = await bcrypt.compare(password, hash);
  } else {
    // Argon2 encoded hashes include their own params — use hash-wasm verify
    const { argon2Verify } = await import('hash-wasm');
    match = await argon2Verify({ password, hash });
  }

  return { match, durationMs: Math.round(performance.now() - start) };
}

// ─── options ──────────────────────────────────────────────────────────────────

interface HashOptions {
  bcryptRounds: number;
  argon2Iterations: number;
  argon2Memory: number;
  argon2Parallelism: number;
}

const DEFAULT_OPTIONS: HashOptions = {
  bcryptRounds: 12,
  argon2Iterations: 3,
  argon2Memory: 65536, // 64 MB
  argon2Parallelism: 4,
};

// ─── component ────────────────────────────────────────────────────────────────

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
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleHash = async () => {
    if (!password) { setError('Enter a password'); return; }
    setLoading(true);
    setError(null);
    setHashResult(null);
    try {
      const result = await hashPassword(password, algorithm, options);
      setHashResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hashing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyPassword_) { setError('Enter a password'); return; }
    if (!verifyHash) { setError('Enter a hash to verify against'); return; }
    setLoading(true);
    setError(null);
    setVerifyResult(null);
    try {
      const algo = verifyHash.startsWith('$2') ? 'bcrypt' :
        verifyHash.startsWith('$argon2id') ? 'argon2id' :
        verifyHash.startsWith('$argon2i') ? 'argon2i' :
        verifyHash.startsWith('$argon2d') ? 'argon2d' : algorithm;
      const result = await verifyPassword(verifyPassword_, verifyHash, algo as Algorithm);
      setVerifyResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const algorithms: { value: Algorithm; label: string; desc: string }[] = [
    { value: 'bcrypt', label: 'bcrypt', desc: 'Classic, widely supported' },
    { value: 'argon2id', label: 'Argon2id', desc: 'Recommended (memory + time)' },
    { value: 'argon2i', label: 'Argon2i', desc: 'Side-channel resistant' },
    { value: 'argon2d', label: 'Argon2d', desc: 'GPU resistant' },
  ];

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Bcrypt / Argon2 Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate and verify bcrypt and Argon2 password hashes — all in-browser, nothing leaves your machine</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-2xl mx-auto space-y-4'>

          {/* Tab */}
          <div className='flex gap-1 bg-[#121212] rounded-lg p-1 w-fit'>
            {(['hash', 'verify'] as Tab[]).map((t) => (
              <button key={t}
                onClick={() => { setTab(t); setError(null); setHashResult(null); setVerifyResult(null); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize
                  ${tab === t ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'hash' && (
            <>
              {/* Algorithm */}
              <Card>
                <CardContent className='pt-6 space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Algorithm</label>
                    <div className='grid grid-cols-2 gap-2'>
                      {algorithms.map((a) => (
                        <button key={a.value} onClick={() => setAlgorithm(a.value)}
                          className={`text-left rounded-md px-3 py-2 border transition-colors
                            ${algorithm === a.value
                              ? 'bg-blue-500/10 border-blue-500/50 text-white'
                              : 'bg-[#121212] border-[hsla(0,0%,20%,1)] text-gray-300 hover:bg-[#1a1a1a]'}`}>
                          <p className='text-sm font-medium font-mono'>{a.label}</p>
                          <p className='text-xs text-gray-500'>{a.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  {algorithm === 'bcrypt' ? (
                    <div>
                      <label className='block text-sm font-medium text-gray-300 mb-2'>
                        Cost factor (rounds): <span className='font-mono text-white'>{options.bcryptRounds}</span>
                        <span className='text-gray-500 font-normal ml-2'>({Math.pow(2, options.bcryptRounds).toLocaleString()} iterations)</span>
                      </label>
                      <input type='range' min={4} max={16} value={options.bcryptRounds}
                        onChange={(e) => setOptions({ ...options, bcryptRounds: parseInt(e.target.value) })}
                        className='w-full accent-blue-500' />
                      <div className='flex justify-between text-xs text-gray-500 mt-1'>
                        <span>4 (fast)</span><span>10 (default)</span><span>16 (slow)</span>
                      </div>
                    </div>
                  ) : (
                    <div className='grid grid-cols-3 gap-3'>
                      {[
                        { label: 'Iterations', key: 'argon2Iterations' as const, min: 1, max: 16 },
                        { label: 'Memory (KB)', key: 'argon2Memory' as const, min: 4096, max: 262144, step: 4096 },
                        { label: 'Parallelism', key: 'argon2Parallelism' as const, min: 1, max: 8 },
                      ].map(({ label, key, min, max, step = 1 }) => (
                        <div key={key}>
                          <label className='block text-xs text-gray-400 mb-1'>{label}</label>
                          <input type='number' value={options[key]} min={min} max={max} step={step}
                            onChange={(e) => setOptions({ ...options, [key]: parseInt(e.target.value) || min })}
                            className='w-full h-9 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500' />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Password input */}
              <Card>
                <CardContent className='pt-6 space-y-3'>
                  <label className='block text-sm font-medium text-gray-300'>Password</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)}
                    type='text' placeholder='Enter password to hash…' className='font-mono'
                    onKeyDown={(e) => e.key === 'Enter' && handleHash()} />
                  <Button onClick={handleHash} disabled={loading || !password} className='w-full' size='lg'>
                    <Scan className='w-4 h-4 mr-2' />
                    {loading ? 'Hashing…' : `Generate ${algorithms.find(a => a.value === algorithm)?.label} hash`}
                  </Button>
                </CardContent>
              </Card>

              {/* Result */}
              {error && (
                <Card className='border-red-500/40'>
                  <CardContent className='pt-6'>
                    <div className='flex items-center gap-2 text-red-400'>
                      <AlertCircle className='w-4 h-4 shrink-0' />
                      <span className='text-sm'>{error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {hashResult && (
                <Card>
                  <CardContent className='pt-6 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium text-gray-300'>{algorithms.find(a => a.value === hashResult.algorithm)?.label} Hash</p>
                        <p className='text-xs text-gray-500'>Generated in {hashResult.durationMs}ms</p>
                      </div>
                      <Button variant='outline' size='sm' onClick={() => handleCopy(hashResult.hash, 'hash')}>
                        {copied === 'hash' ? <><Check className='w-3 h-3 mr-1' />Copied</> : <><Copy className='w-3 h-3 mr-1' />Copy</>}
                      </Button>
                    </div>
                    <div className='bg-[#121212] rounded-md p-4 font-mono text-xs text-green-400 break-all'>
                      {hashResult.hash}
                    </div>
                    <Button variant='outline' size='sm' className='w-full'
                      onClick={() => { setTab('verify'); setVerifyHash(hashResult.hash); }}>
                      Test this hash in Verify tab →
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {tab === 'verify' && (
            <>
              <Card>
                <CardContent className='pt-6 space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-1'>Password</label>
                    <Input value={verifyPassword_} onChange={(e) => setVerifyPassword_(e.target.value)}
                      type='text' placeholder='Password to test…' className='font-mono'
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()} />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-1'>Hash</label>
                    <Textarea value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)}
                      placeholder='$2b$12$… or $argon2id$v=…' rows={4} className='font-mono text-xs' />
                    <p className='text-xs text-gray-500 mt-1'>Algorithm is auto-detected from the hash prefix</p>
                  </div>
                  <Button onClick={handleVerify} disabled={loading || !verifyPassword_ || !verifyHash} className='w-full' size='lg'>
                    <Scan className='w-4 h-4 mr-2' />
                    {loading ? 'Verifying…' : 'Verify Password'}
                  </Button>
                </CardContent>
              </Card>

              {error && (
                <Card className='border-red-500/40'>
                  <CardContent className='pt-6'>
                    <div className='flex items-center gap-2 text-red-400'>
                      <AlertCircle className='w-4 h-4 shrink-0' />
                      <span className='text-sm'>{error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {verifyResult && (
                <Card className={verifyResult.match ? 'border-green-500/40' : 'border-red-500/40'}>
                  <CardContent className='pt-6'>
                    <div className='flex items-center gap-3'>
                      {verifyResult.match
                        ? <CheckCircle className='w-6 h-6 text-green-400 shrink-0' />
                        : <XCircle className='w-6 h-6 text-red-400 shrink-0' />}
                      <div>
                        <p className={`text-lg font-semibold ${verifyResult.match ? 'text-green-400' : 'text-red-400'}`}>
                          {verifyResult.match ? 'Password matches' : 'Password does not match'}
                        </p>
                        <p className='text-xs text-gray-500'>Verified in {verifyResult.durationMs}ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Info */}
          <Card>
            <CardContent className='pt-6 space-y-2'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Algorithm Guide</p>
              <div className='space-y-2 text-xs text-gray-400'>
                <div className='flex gap-2'><span className='font-mono text-blue-400 w-20 shrink-0'>bcrypt</span><span>Widely supported, 72-char password limit, cost factor controls speed</span></div>
                <div className='flex gap-2'><span className='font-mono text-green-400 w-20 shrink-0'>argon2id</span><span>Winner of Password Hashing Competition. Resistant to both side-channel and GPU attacks. Recommended for new systems</span></div>
                <div className='flex gap-2'><span className='font-mono text-yellow-400 w-20 shrink-0'>argon2i</span><span>Optimised against side-channel attacks; prefer argon2id unless you have a specific reason</span></div>
                <div className='flex gap-2'><span className='font-mono text-orange-400 w-20 shrink-0'>argon2d</span><span>Maximum GPU resistance; vulnerable to side-channel — not suitable for password hashing</span></div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
