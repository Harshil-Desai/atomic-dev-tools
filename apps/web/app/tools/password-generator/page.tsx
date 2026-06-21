'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIGUOUS = /[Il1O0]/g;
const VOWELS = 'aeiou';
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';

function entropyBits(charsetSize: number, length: number): number { return length * Math.log2(charsetSize); }

function entropyLabel(bits: number): { label: string; color: string; pct: number } {
  if (bits < 40) return { label: 'Weak', color: '#ef4444', pct: 15 };
  if (bits < 60) return { label: 'Fair', color: '#eab308', pct: 40 };
  if (bits < 80) return { label: 'Strong', color: '#3b82f6', pct: 70 };
  return { label: 'Very Strong', color: '#22c55e', pct: 100 };
}

function generateSecure(length: number, charset: string): string {
  if (!charset) return '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => charset[n % charset.length]).join('');
}

function generatePronounceable(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b, i) => { const pool = i % 2 === 0 ? CONSONANTS : VOWELS; return pool[b % pool.length]; }).join('');
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
      if (pronounceable) results.push(generatePronounceable(length));
      else { const charset = buildCharset(); results.push(charset ? generateSecure(length, charset) : ''); }
    }
    setPasswords(results);
  }, [length, count, pronounceable, buildCharset]);

  useEffect(() => { generate(); }, [generate]);

  const charset = buildCharset();
  const bits = pronounceable ? ((Math.log2(CONSONANTS.length) + Math.log2(VOWELS.length)) / 2) * length : entropyBits(charset.length, length);
  const { label, color, pct } = entropyLabel(bits);

  const Toggle = ({ checked, onChange, label: lbl }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer', flexShrink: 0,
          background: checked ? 'var(--bp-accent)' : 'var(--bp-border-str)',
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: 2, width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#fff' : 'var(--bp-ink-mute)',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s, background 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--bp-ink)' }}>{lbl}</span>
    </label>
  );

  const entropyBadgeStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 2,
    background: label === 'Weak' ? 'rgba(239,68,68,0.15)' : label === 'Fair' ? 'rgba(234,179,8,0.15)' : label === 'Strong' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
    color: label === 'Weak' ? '#ef4444' : label === 'Fair' ? '#eab308' : label === 'Strong' ? '#3b82f6' : '#22c55e',
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='security'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      <div className='border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0 p-4 sm:p-5 md:p-6'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>Password Generator</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Generate cryptographically secure passwords with entropy scoring</p>
      </div>

      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden'>

        {/* Settings Panel */}
        <Panel title='Settings' style={{ borderRight: 0, borderTop: 0 }}>
          <div className='flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-4 sm:gap-5' style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Length slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--bp-ink)', fontWeight: 500 }}>Length</span>
                <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', fontFamily: 'inherit' }}>{length} chars</span>
              </div>
              <input
                type='range' min={8} max={128} value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--bp-accent)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--bp-ink-faint)', marginTop: 4 }}>
                <span>8</span><span>128</span>
              </div>
            </div>

            {/* Character sets */}
            <div>
              <p style={{ fontSize: 11, color: 'var(--bp-ink)', fontWeight: 500, margin: 0, marginBottom: 10 }}>Character sets</p>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5' style={{ display: 'grid', gap: 10 }}>
                <Toggle checked={useUpper} onChange={setUseUpper} label='Uppercase (A-Z)' />
                <Toggle checked={useLower} onChange={setUseLower} label='Lowercase (a-z)' />
                <Toggle checked={useDigits} onChange={setUseDigits} label='Digits (0-9)' />
                <Toggle checked={useSymbols} onChange={setUseSymbols} label='Symbols (!@#...)' />
              </div>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Toggle checked={excludeAmbiguous} onChange={setExcludeAmbiguous} label='Exclude ambiguous chars (I, l, O, 0, 1)' />
              <Toggle checked={pronounceable} onChange={setPronounceable} label='Pronounceable (alternating consonants/vowels)' />
            </div>

            {/* Custom exclude */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Custom exclude characters</label>
              <input
                value={customExclude}
                onChange={(e) => setCustomExclude(e.target.value)}
                placeholder='e.g. @ # $'
                style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--bp-ink)', fontWeight: 500 }}>Generate</span>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '5px 8px', outline: 'none' }}
              >
                {[1, 5, 10].map((n) => <option key={n} value={n}>{n} password{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>

          </div>

          {/* Entropy bar */}
          <div className='border-t border-dashed border-[var(--bp-border-str)] p-2 sm:p-3 flex-shrink-0'>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Entropy</span>
              <span style={entropyBadgeStyle}>{label} — {bits.toFixed(1)} bits</span>
            </div>
            <div style={{ height: 4, background: 'var(--bp-border-str)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
            {!pronounceable && charset.length === 0 && (
              <p style={{ fontSize: 10, color: '#ef4444', margin: 0, marginTop: 6 }}>Select at least one character set.</p>
            )}
          </div>
        </Panel>

        {/* Output Panel */}
        <Panel title={`Generated password${passwords.length > 1 ? 's' : ''}`} style={{ borderTop: 0 }}>
          <div className='flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b border-dashed border-[var(--bp-border-str)] flex-shrink-0'>
            <button type='button' className='bp-btn min-h-10 px-3' onClick={generate}>
              <RefreshCw className='w-3.5 h-3.5 mr-1 inline' />REGEN
            </button>
            <button type='button' className='bp-btn min-h-10 px-3' onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className='w-4 h-4 mr-1 inline' /> : <Eye className='w-4 h-4 mr-1 inline' />}
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          <div className='flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 sm:gap-3' style={{ display: 'flex', flexDirection: 'column' }}>
            {passwords.map((pw, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  readOnly
                  value={showPassword ? pw : '•'.repeat(pw.length)}
                  style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 13, padding: '8px 10px', outline: 'none', boxSizing: 'border-box', letterSpacing: showPassword ? '0.05em' : '0.1em' }}
                />
                <BpCopyBtn text={pw} label='COPY' />
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}
