'use client';

import { useState, useCallback } from 'react';
import { Binary, Trash2, AlertTriangle } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

type Base = 'decimal' | 'binary' | 'octal' | 'hex';
type Sign = 'unsigned' | 'signed';

interface BaseConfig { label: string; radix: number; placeholder: string; validChars: RegExp; prefix: string; }

const BASE_CONFIGS: Record<Base, BaseConfig> = {
  decimal: { label: 'Decimal', radix: 10, placeholder: '255', validChars: /^[0-9]*$/, prefix: '' },
  binary: { label: 'Binary', radix: 2, placeholder: '11111111', validChars: /^[01]*$/, prefix: '0b' },
  octal: { label: 'Octal', radix: 8, placeholder: '377', validChars: /^[0-7]*$/, prefix: '0o' },
  hex: { label: 'Hexadecimal', radix: 16, placeholder: 'FF', validChars: /^[0-9a-fA-F]*$/, prefix: '0x' },
};

const BIT_WIDTHS = [8, 16, 32] as const;

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

function toSigned(value: number, bits: number): number {
  const max = 2 ** (bits - 1);
  return value >= max ? value - 2 ** bits : value;
}

function chunkBinary(bin: string, chunkSize = 4): string {
  const padded = bin.padStart(Math.ceil(bin.length / chunkSize) * chunkSize, '0');
  return padded.match(/.{1,4}/g)?.join(' ') ?? padded;
}

export default function NumberBaseConverterPage() {
  const [values, setValues] = useState<Record<Base, string>>({ decimal: '', binary: '', octal: '', hex: '' });
  const [overflow, setOverflow] = useState(false);
  const [sign, setSign] = useState<Sign>('unsigned');

  const updateAll = useCallback((num: number) => {
    setOverflow(false);
    setValues({ decimal: num.toString(10), binary: num.toString(2), octal: num.toString(8), hex: num.toString(16).toUpperCase() });
  }, []);

  const handleChange = (base: Base, raw: string) => {
    const config = BASE_CONFIGS[base];
    if (raw === '') { setValues({ decimal: '', binary: '', octal: '', hex: '' }); setOverflow(false); return; }
    if (!config.validChars.test(raw)) return;
    const num = parseInt(raw, config.radix);
    if (isNaN(num)) { setValues((prev) => ({ ...prev, [base]: raw })); return; }
    if (num > Number.MAX_SAFE_INTEGER) { setOverflow(true); setValues((prev) => ({ ...prev, [base]: raw })); return; }
    updateAll(num);
    setValues((prev) => ({ ...prev, [base]: raw }));
  };

  const handleClearAll = () => { setValues({ decimal: '', binary: '', octal: '', hex: '' }); setOverflow(false); };

  const decimalNum = parseInt(values.decimal, 10);
  const hasValue = values.decimal !== '' && !isNaN(decimalNum);

  const getBitRepresentation = (bits: (typeof BIT_WIDTHS)[number]) => {
    if (!hasValue) return { fits: false, value: '0'.repeat(bits), signedValue: null };
    const max = 2 ** bits - 1;
    const fits = decimalNum >= 0 && decimalNum <= max;
    if (!fits) return { fits: false, value: 'overflow', signedValue: null };
    const bin = decimalNum.toString(2).padStart(bits, '0');
    const signedValue = sign === 'signed' ? toSigned(decimalNum, bits) : null;
    return { fits: true, value: bin, signedValue };
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='data'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <Binary style={{ width: 16, height: 16, color: 'var(--bp-accent)', flexShrink: 0 }} />
          <h1 style={{ fontSize: 13, fontWeight: 600, color: 'var(--bp-ink)', letterSpacing: '0.02em', margin: 0 }}>Number Base Converter</h1>
        </div>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0, paddingLeft: 26 }}>Convert between decimal, binary, octal and hexadecimal</p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Options panel */}
        <Panel title='Options'>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', overflow: 'hidden', border: '1px solid var(--bp-border-str)' }}>
              {(['unsigned', 'signed'] as Sign[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSign(s)}
                  style={{
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    border: 0,
                    background: sign === s ? 'var(--bp-accent)' : 'var(--bp-elevated)',
                    color: sign === s ? '#0a0e14' : 'var(--bp-ink-mute)',
                    transition: 'background 0.15s, color 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {s === 'unsigned' ? 'UNSIGNED' : "SIGNED (TWO'S COMPLEMENT)"}
                </button>
              ))}
            </div>
            <button className='bp-btn' onClick={handleClearAll} type='button' style={{ marginLeft: 'auto' }}>
              <Trash2 style={{ width: 12, height: 12, marginRight: 4, display: 'inline' }} />CLEAR ALL
            </button>
          </div>
        </Panel>

        {/* Overflow warning */}
        {overflow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#fbbf24', background: 'rgba(120,53,15,0.25)', border: '1px solid #92400e', padding: '8px 12px' }}>
            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>Overflow — number exceeds Number.MAX_SAFE_INTEGER. Results may be inaccurate.</span>
          </div>
        )}

        {/* Base input panels grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {(Object.entries(BASE_CONFIGS) as [Base, BaseConfig][]).map(([base, config], idx) => {
            const isRight = idx % 2 === 1;
            const isBottom = idx >= 2;
            return (
              <Panel
                key={base}
                title={config.label}
                meta={config.prefix || undefined}
                style={{
                  borderRight: isRight ? '1px solid var(--bp-border)' : 0,
                  borderLeft: isRight ? 0 : '1px solid var(--bp-border)',
                  borderTop: isBottom ? 0 : '1px solid var(--bp-border)',
                  borderBottom: '1px solid var(--bp-border)',
                }}
              >
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={values[base]}
                      onChange={(e) => handleChange(base, e.target.value)}
                      placeholder={config.placeholder}
                      spellCheck={false}
                      autoComplete='off'
                      style={{
                        flex: 1,
                        background: 'var(--bp-bg)',
                        border: '1px solid var(--bp-border-str)',
                        color: 'var(--bp-ink)',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        padding: '7px 10px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        letterSpacing: '0.08em',
                      }}
                    />
                    <BpCopyBtn text={values[base]} label='COPY' />
                  </div>
                  {base === 'binary' && values.binary && (
                    <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', fontFamily: 'inherit', wordBreak: 'break-all', lineHeight: 1.7, margin: 0 }}>
                      {chunkBinary(values.binary)}
                    </p>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>

        {/* Bit width representation */}
        {hasValue && (
          <Panel title='Bit Width Representation'>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {BIT_WIDTHS.map((bits) => {
                const { fits, value, signedValue } = getBitRepresentation(bits);
                return (
                  <div key={bits} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--bp-ink-mute)', minWidth: 36 }}>{bits}-bit</span>
                      {!fits ? (
                        <span style={{ fontSize: 10, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle style={{ width: 11, height: 11 }} />Does not fit in {bits} bits
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)' }}>
                          {sign === 'signed' && signedValue !== null && signedValue !== decimalNum
                            ? `Signed value: ${signedValue}`
                            : `Fits in ${bits} bits`}
                        </span>
                      )}
                    </div>
                    {fits && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {value.match(/.{1,4}/g)?.map((chunk, i) => (
                          <span
                            key={i}
                            style={{
                              fontFamily: 'inherit',
                              fontSize: 11,
                              background: 'var(--bp-bg)',
                              border: '1px solid var(--bp-border-str)',
                              padding: '2px 6px',
                              color: 'var(--bp-ink)',
                              letterSpacing: '0.12em',
                            }}
                          >
                            {chunk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Empty state */}
        {!hasValue && !overflow && (
          <div style={{ textAlign: 'center', color: 'var(--bp-ink-faint)', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Binary style={{ width: 36, height: 36, opacity: 0.3 }} />
            <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Type a number in any field to convert all bases simultaneously</p>
          </div>
        )}

      </div>
    </div>
  );
}
