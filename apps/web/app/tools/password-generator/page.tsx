'use client'
import { useState, useEffect, useCallback } from 'react';
import { Lock, Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/ui';
import { Card, CardContent } from '@/ui';
import { Input } from '@/ui';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIGUOUS = /[Il1O0]/g;

const VOWELS = 'aeiou';
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';

function entropyBits(charsetSize: number, length: number): number {
  return length * Math.log2(charsetSize);
}

function entropyLabel(bits: number): { label: string; color: string; pct: number } {
  if (bits < 40) return { label: 'Weak', color: 'bg-red-500', pct: 15 };
  if (bits < 60) return { label: 'Fair', color: 'bg-yellow-500', pct: 40 };
  if (bits < 80) return { label: 'Strong', color: 'bg-blue-500', pct: 70 };
  return { label: 'Very Strong', color: 'bg-green-500', pct: 100 };
}

function generateSecure(
  length: number,
  charset: string,
): string {
  if (!charset) return '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => charset[n % charset.length]).join('');
}

function generatePronounceable(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b, i) => {
    const pool = i % 2 === 0 ? CONSONANTS : VOWELS;
    return pool[b % pool.length];
  }).join('');
}

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(20);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [customExclude, setCustomExclude] = useState('');
  const [pronounceable, setPronounceable] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [count, setCount] = useState(1);

  const buildCharset = useCallback(() => {
    let c = '';
    if (useUpper) c += UPPER;
    if (useLower) c += LOWER;
    if (useDigits) c += DIGITS;
    if (useSymbols) c += SYMBOLS;
    if (excludeAmbiguous) c = c.replace(AMBIGUOUS, '');
    for (const ch of customExclude) c = c.split(ch).join('');
    return c;
  }, [useUpper, useLower, useDigits, useSymbols, excludeAmbiguous, customExclude]);

  const generate = useCallback(() => {
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      if (pronounceable) {
        results.push(generatePronounceable(length));
      } else {
        const charset = buildCharset();
        results.push(charset ? generateSecure(length, charset) : '');
      }
    }
    setPasswords(results);
  }, [length, count, pronounceable, buildCharset]);

  useEffect(() => { generate(); }, [generate]);

  const copy = (idx: number) => {
    navigator.clipboard.writeText(passwords[idx] ?? '');
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const charset = buildCharset();
  // For pronounceable mode: each position alternates between consonants (22) and
  // vowels (5), so average entropy per character is the mean of the two log2 values.
  const bits = pronounceable
    ? ((Math.log2(CONSONANTS.length) + Math.log2(VOWELS.length)) / 2) * length
    : entropyBits(charset.length, length);
  const { label, color, pct } = entropyLabel(bits);

  const Toggle = ({
    checked, onChange, label: lbl,
  }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className='flex items-center gap-2 cursor-pointer select-none'>
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-white' : 'bg-[#333333]'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className='text-sm text-muted-foreground'>{lbl}</span>
    </label>
  );

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2'>
          <Lock className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>Password Generator</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
          Generate cryptographically secure passwords using <code className='text-xs bg-muted px-1 rounded'>crypto.getRandomValues</code>
        </p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-2xl mx-auto space-y-4'>

          {/* Settings */}
          <Card>
            <CardContent className='pt-6 space-y-5'>
              {/* Length */}
              <div>
                <div className='flex justify-between mb-2'>
                  <span className='text-sm font-medium text-foreground'>Length</span>
                  <span className='text-sm font-mono text-muted-foreground'>{length} chars</span>
                </div>
                <input
                  type='range' min={8} max={128} value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className='w-full accent-white cursor-pointer'
                />
                <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                  <span>8</span><span>128</span>
                </div>
              </div>

              {/* Character sets */}
              <div>
                <p className='text-sm font-medium text-foreground mb-3'>Character sets</p>
                <div className='grid grid-cols-2 gap-3'>
                  <Toggle checked={useUpper} onChange={setUseUpper} label='Uppercase (A-Z)' />
                  <Toggle checked={useLower} onChange={setUseLower} label='Lowercase (a-z)' />
                  <Toggle checked={useDigits} onChange={setUseDigits} label='Digits (0-9)' />
                  <Toggle checked={useSymbols} onChange={setUseSymbols} label='Symbols (!@#...)' />
                </div>
              </div>

              {/* Options */}
              <div className='space-y-3'>
                <Toggle checked={excludeAmbiguous} onChange={setExcludeAmbiguous} label='Exclude ambiguous chars (I, l, O, 0, 1)' />
                <Toggle checked={pronounceable} onChange={setPronounceable} label='Pronounceable (alternating consonants/vowels)' />
              </div>

              {/* Custom exclude */}
              <div>
                <label className='block text-sm font-medium text-foreground mb-1'>
                  Custom exclude characters
                </label>
                <Input
                  value={customExclude}
                  onChange={(e) => setCustomExclude(e.target.value)}
                  placeholder='e.g.  @ # $'
                  className='font-mono'
                />
              </div>

              {/* Count */}
              <div className='flex items-center gap-3'>
                <span className='text-sm font-medium text-foreground'>Generate</span>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className='bg-[#1C1C1C] border border-border text-foreground text-sm rounded-md px-2 py-1'
                >
                  {[1, 5, 10].map((n) => (
                    <option key={n} value={n}>{n} password{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Entropy */}
          <Card>
            <CardContent className='pt-6'>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-sm font-medium text-foreground'>Entropy</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  label === 'Weak' ? 'bg-red-900/40 text-red-400' :
                  label === 'Fair' ? 'bg-yellow-900/40 text-yellow-400' :
                  label === 'Strong' ? 'bg-blue-900/40 text-blue-400' :
                  'bg-green-900/40 text-green-400'
                }`}>{label} — {bits.toFixed(1)} bits</span>
              </div>
              <div className='h-2 bg-[#333333] rounded-full overflow-hidden'>
                <div
                  className={`h-full ${color} transition-all duration-300 rounded-full`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!pronounceable && charset.length === 0 && (
                <p className='text-xs text-red-400 mt-2'>Select at least one character set.</p>
              )}
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-sm font-medium text-foreground'>
                  Generated password{passwords.length > 1 ? 's' : ''}
                </span>
                <Button variant='outline' size='sm' onClick={generate} className='gap-1.5'>
                  <RefreshCw className='w-3.5 h-3.5' /> Regenerate
                </Button>
              </div>

              {passwords.map((pw, i) => (
                <div key={i} className='flex items-center gap-2'>
                  <div className='flex-1 relative'>
                    <Input
                      readOnly
                      value={showPassword ? pw : '•'.repeat(pw.length)}
                      className='font-mono text-sm pr-10 bg-[#121212]'
                    />
                  </div>
                  <Button
                    variant='outline' size='icon'
                    onClick={() => setShowPassword(!showPassword)}
                    className='shrink-0'
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </Button>
                  <Button
                    variant='outline' size='icon'
                    onClick={() => copy(i)}
                    className='shrink-0'
                  >
                    {copied === i ? <Check className='w-4 h-4 text-green-400' /> : <Copy className='w-4 h-4' />}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
