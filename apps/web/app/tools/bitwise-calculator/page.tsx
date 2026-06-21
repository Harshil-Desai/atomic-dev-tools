'use client';

import React, { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';

// ─── types ────────────────────────────────────────────────────────────────────

type Operation = 'AND' | 'OR' | 'XOR' | 'NOT' | 'LSHIFT' | 'RSHIFT' | 'SWAP';
type BitWidth = 8 | 16 | 32;
type InputBase = 'dec' | 'hex' | 'bin';

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseInput(val: string, base: InputBase): number | null {
  const s = val.trim().replace(/^0x/i, '').replace(/\s/g, '');
  if (!s) return null;
  let n: number;
  if (base === 'hex') n = parseInt(s, 16);
  else if (base === 'bin') n = parseInt(s.replace(/_/g, ''), 2);
  else n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function mask(n: number, width: BitWidth): number {
  if (width === 8) return n & 0xff;
  if (width === 16) return n & 0xffff;
  return n >>> 0;
}

function swapBytes(n: number, width: BitWidth): number {
  if (width === 8) return n & 0xff;
  if (width === 16) {
    return ((n & 0xff) << 8) | ((n >> 8) & 0xff);
  }
  const b0 = (n >>> 24) & 0xff;
  const b1 = (n >>> 16) & 0xff;
  const b2 = (n >>> 8) & 0xff;
  const b3 = n & 0xff;
  return ((b3 << 24) | (b2 << 16) | (b1 << 8) | b0) >>> 0;
}

function compute(a: number, b: number, op: Operation, width: BitWidth): number {
  switch (op) {
    case 'AND': return mask(a & b, width);
    case 'OR': return mask(a | b, width);
    case 'XOR': return mask(a ^ b, width);
    case 'NOT': return mask(~a, width);
    case 'LSHIFT': return mask(a << (b % width), width);
    case 'RSHIFT': return mask(a >>> (b % width), width);
    case 'SWAP': return swapBytes(a, width);
  }
}

function toBin(n: number, width: BitWidth): string {
  return n.toString(2).padStart(width, '0');
}

function toHex(n: number, width: BitWidth): string {
  const digits = width / 4;
  return '0x' + n.toString(16).toUpperCase().padStart(digits, '0');
}

function groupBits(bin: string): string {
  return bin.replace(/(.{4})/g, '$1 ').trim();
}

// ─── CSS vars ─────────────────────────────────────────────────────────────────

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#b48cff',
} as React.CSSProperties;

// ─── bit display component ────────────────────────────────────────────────────

function BitRow({ value, width, label }: { value: number; width: BitWidth; label: string }) {
  const bin = toBin(value, width);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>{label}</span>
        <span style={{ fontFamily: 'inherit', fontSize: 10, color: 'var(--bp-ink-mute)' }}>{toHex(value, width)} | {value}</span>
      </div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {bin.split('').map((bit, i) => (
          <div key={i} style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontFamily: 'inherit',
            fontWeight: 700,
            border: bit === '1' ? '1px solid rgba(180,140,255,0.5)' : '1px solid var(--bp-border)',
            background: bit === '1' ? 'rgba(180,140,255,0.18)' : 'var(--bp-bg)',
            color: bit === '1' ? '#b48cff' : 'var(--bp-ink-faint)',
          }}>
            {bit}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
        {Array.from({ length: width }, (_, i) => width - 1 - i).map((pos, i) => (
          <div key={i} style={{ width: 22, textAlign: 'center' }}>
            {pos % 4 === 0 || pos === 0 ? <span style={{ fontSize: 8, color: 'var(--bp-ink-faint)' }}>{pos}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel component ──────────────────────────────────────────────────────────

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

// ─── component ────────────────────────────────────────────────────────────────

const UNARY_OPS: Operation[] = ['NOT', 'SWAP'];

export default function BitwiseCalculatorPage() {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkViewport = () => setIsDesktop(window.innerWidth >= 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const [inputA, setInputA] = useState('42');
  const [inputB, setInputB] = useState('15');
  const [baseA, setBaseA] = useState<InputBase>('dec');
  const [baseB, setBaseB] = useState<InputBase>('dec');
  const [op, setOp] = useState<Operation>('AND');
  const [width, setWidth] = useState<BitWidth>(8);

  const a = parseInput(inputA, baseA);
  const b = parseInput(inputB, baseB);
  const isUnary = UNARY_OPS.includes(op);

  const aValid = a !== null;
  const bValid = isUnary || b !== null;
  const canCompute = aValid && bValid;

  const result = canCompute ? compute(a!, isUnary ? 0 : b!, op, width) : null;

  const ops: { label: string; value: Operation; sym: string }[] = [
    { label: 'AND', value: 'AND', sym: '&' },
    { label: 'OR', value: 'OR', sym: '|' },
    { label: 'XOR', value: 'XOR', sym: '^' },
    { label: 'NOT', value: 'NOT', sym: '~' },
    { label: 'Left Shift', value: 'LSHIFT', sym: '<<' },
    { label: 'Right Shift', value: 'RSHIFT', sym: '>>' },
    { label: 'Swap Endian', value: 'SWAP', sym: '⇄' },
  ];

  const bases: { label: string; value: InputBase }[] = [
    { label: 'Dec', value: 'dec' },
    { label: 'Hex', value: 'hex' },
    { label: 'Bin', value: 'bin' },
  ];

  if (!isDesktop) {
    return (
      <div className='h-full flex flex-col items-center justify-center' style={{...CSS_VARS, background: 'var(--bp-bg)', color: 'var(--bp-ink)', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace'}}>
        <div className='text-center px-4 sm:px-6'>
          <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Desktop Only</h1>
          <p className='text-sm sm:text-base text-[var(--bp-ink-mute)] mb-4'>This tool requires a larger screen for optimal use.</p>
          <p className='text-xs sm:text-sm text-[var(--bp-ink-faint)]'>Please open this tool on a desktop or laptop (1024px+ width)</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='systems'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Bitwise Calculator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Perform AND, OR, XOR and shift operations with bit-level visualization</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* Left: Controls */}
        <Panel title='Configuration' style={{ borderRight: 0, borderTop: 0, borderLeft: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Bit Width */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Bit Width</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([8, 16, 32] as BitWidth[]).map((w) => (
                  <button key={w} type='button' onClick={() => setWidth(w)}
                    style={width === w ? { background: 'var(--bp-accent)', color: '#0a0e14', border: 'none', padding: '5px 14px', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' } : undefined}
                    className={width === w ? undefined : 'bp-btn'}
                  >
                    {w}-bit
                  </button>
                ))}
              </div>
            </div>

            {/* Operation */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Operation</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ops.map((o) => (
                  <button key={o.value} type='button' onClick={() => setOp(o.value)}
                    style={op === o.value ? { background: 'var(--bp-accent)', color: '#0a0e14', border: 'none', padding: '5px 12px', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' } : undefined}
                    className={op === o.value ? undefined : 'bp-btn'}
                  >
                    <span style={{ fontFamily: 'inherit', marginRight: 4, color: op === o.value ? '#0a0e14' : '#b48cff' }}>{o.sym}</span>{o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operand A */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Operand A</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {bases.map((bv) => (
                  <button key={bv.value} type='button' onClick={() => setBaseA(bv.value)}
                    style={baseA === bv.value ? { background: 'var(--bp-accent)', color: '#0a0e14', border: 'none', padding: '4px 10px', fontSize: 10, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' } : undefined}
                    className={baseA === bv.value ? undefined : 'bp-btn'}
                  >
                    {bv.label}
                  </button>
                ))}
              </div>
              <input
                value={inputA}
                onChange={(e) => setInputA(e.target.value)}
                placeholder={baseA === 'hex' ? '0x2A' : baseA === 'bin' ? '00101010' : '42'}
                style={{
                  flex: 1,
                  width: '100%',
                  background: 'var(--bp-bg)',
                  border: !aValid && inputA ? '1px solid rgba(220,80,80,0.5)' : '1px solid var(--bp-border-str)',
                  color: 'var(--bp-ink)',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  padding: '7px 10px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Operand B */}
            {!isUnary && (
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Operand B</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {bases.map((bv) => (
                    <button key={bv.value} type='button' onClick={() => setBaseB(bv.value)}
                      style={baseB === bv.value ? { background: 'var(--bp-accent)', color: '#0a0e14', border: 'none', padding: '4px 10px', fontSize: 10, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' } : undefined}
                      className={baseB === bv.value ? undefined : 'bp-btn'}
                    >
                      {bv.label}
                    </button>
                  ))}
                </div>
                <input
                  value={inputB}
                  onChange={(e) => setInputB(e.target.value)}
                  placeholder={baseB === 'hex' ? '0x0F' : baseB === 'bin' ? '00001111' : '15'}
                  style={{
                    flex: 1,
                    width: '100%',
                    background: 'var(--bp-bg)',
                    border: !bValid && inputB ? '1px solid rgba(220,80,80,0.5)' : '1px solid var(--bp-border-str)',
                    color: 'var(--bp-ink)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    padding: '7px 10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Common Patterns */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Common Patterns</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Check bit n', 'val & (1 << n)'],
                  ['Set bit n', 'val | (1 << n)'],
                  ['Clear bit n', 'val & ~(1 << n)'],
                  ['Toggle bit n', 'val ^ (1 << n)'],
                  ['Check if power of 2', 'val & (val - 1) == 0'],
                  ['Lower nibble', 'val & 0x0F'],
                  ['Upper nibble (8-bit)', '(val >> 4) & 0x0F'],
                  ['Align to 4 bytes', '(val + 3) & ~3'],
                ].map(([desc, pattern]) => (
                  <div key={desc} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', width: 140, flexShrink: 0 }}>{desc}</span>
                    <code style={{ fontSize: 10, color: '#b48cff', fontFamily: 'inherit' }}>{pattern}</code>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </Panel>

        {/* Right: Visualization + Results */}
        <Panel title='Output' style={{ borderTop: 0, borderRight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {canCompute && result !== null ? (
              <>
                {/* Bit Visualization */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 10 }}>Bit Visualization</div>
                  <BitRow value={mask(a!, width)} width={width} label='A' />
                  {!isUnary && <BitRow value={mask(b!, width)} width={width} label='B' />}
                  <div style={{ borderTop: '1px solid var(--bp-border)', paddingTop: 12, marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Result</span>
                      <span style={{ fontFamily: 'inherit', fontSize: 10, color: '#b48cff' }}>({op})</span>
                    </div>
                    <BitRow value={result} width={width} label='Result' />
                  </div>
                </div>

                {/* Result Representations */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 10 }}>Result Representations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Decimal', value: result.toString(10) },
                      { label: 'Hexadecimal', value: toHex(result, width) },
                      { label: 'Binary', value: groupBits(toBin(result, width)) },
                      { label: 'Octal', value: '0o' + result.toString(8) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', width: 88, flexShrink: 0 }}>{label}</span>
                        <code style={{ flex: 1, background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '5px 10px', fontSize: 11, fontFamily: 'inherit', color: 'var(--bp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</code>
                        <BpCopyBtn text={value} label='COPY' />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--bp-ink-faint)' }}>Enter valid operand{!isUnary ? 's' : ''} to see results</span>
              </div>
            )}

          </div>
        </Panel>

      </div>
    </div>
  );
}
