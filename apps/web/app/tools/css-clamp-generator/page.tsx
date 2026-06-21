'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';

interface ClampResult { clampValue: string; slope: number; intercept: number; slopeVw: number; preferredCalc: string; }

function generateClamp(minSize: number, maxSize: number, minVp: number, maxVp: number, unit: 'px' | 'rem', rootSize: number): ClampResult | null {
  if (minVp >= maxVp || minSize >= maxSize) return null;
  const slope = (maxSize - minSize) / (maxVp - minVp);
  const intercept = minSize - slope * minVp;
  const slopeVw = slope * 100;
  if (unit === 'rem') {
    const minRem = (minSize / rootSize).toFixed(4).replace(/\.?0+$/, '');
    const maxRem = (maxSize / rootSize).toFixed(4).replace(/\.?0+$/, '');
    const interceptRem = (intercept / rootSize).toFixed(4).replace(/\.?0+$/, '');
    const slopeStr = slopeVw.toFixed(4).replace(/\.?0+$/, '');
    const preferred = `${interceptRem}rem + ${slopeStr}vw`;
    return { clampValue: `clamp(${minRem}rem, calc(${preferred}), ${maxRem}rem)`, slope, intercept, slopeVw, preferredCalc: preferred };
  }
  const interceptStr = intercept.toFixed(4).replace(/\.?0+$/, '');
  const slopeStr = slopeVw.toFixed(4).replace(/\.?0+$/, '');
  const preferred = `${interceptStr}px + ${slopeStr}vw`;
  return { clampValue: `clamp(${minSize}px, calc(${preferred}), ${maxSize}px)`, slope, intercept, slopeVw, preferredCalc: preferred };
}

function PreviewCurve({ minSize, maxSize, minVp, maxVp }: { minSize: number; maxSize: number; minVp: number; maxVp: number }) {
  const W = 320, H = 100, pad = 20;
  const vpMin = 200, vpMax = 1800;
  const sMin = Math.min(minSize, maxSize) * 0.8;
  const sMax = Math.max(minSize, maxSize) * 1.2;
  const toX = (vp: number) => pad + ((vp - vpMin) / (vpMax - vpMin)) * (W - 2 * pad);
  const toY = (s: number) => (H - pad) - ((s - sMin) / (sMax - sMin)) * (H - 2 * pad);
  const clampedSize = (vp: number) => Math.min(maxSize, Math.max(minSize, minSize + ((maxSize - minSize) / (maxVp - minVp)) * (vp - minVp)));
  const points: string[] = [];
  for (let vp = vpMin; vp <= vpMax; vp += 20) points.push(`${toX(vp)},${toY(clampedSize(vp))}`);
  const x1 = toX(minVp), x2 = toX(maxVp), y1 = toY(minSize), y2 = toY(maxSize);
  return (
    <svg width={W} height={H} style={{ width: '100%', borderRadius: 3 }}>
      <rect width={W} height={H} fill='#0a0e14' rx='2' />
      {[minVp, maxVp].map((vp) => <line key={vp} x1={toX(vp)} y1={pad / 2} x2={toX(vp)} y2={H - pad / 2} stroke='rgba(255,255,255,0.1)' strokeWidth='1' strokeDasharray='3,3' />)}
      <line x1={pad} y1={toY(minSize)} x2={toX(minVp)} y2={toY(minSize)} stroke='rgba(240,198,116,0.3)' strokeWidth='1.5' />
      <line x1={toX(maxVp)} y1={toY(maxSize)} x2={W - pad} y2={toY(maxSize)} stroke='rgba(240,198,116,0.3)' strokeWidth='1.5' />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke='rgba(91,176,255,0.6)' strokeWidth='2' />
      <polyline points={points.join(' ')} fill='none' stroke='#f0c674' strokeWidth='2' />
      <circle cx={x1} cy={y1} r='4' fill='#5fb0ff' />
      <circle cx={x2} cy={y2} r='4' fill='#5fb0ff' />
      <text x={toX(minVp)} y={H - 4} textAnchor='middle' fontSize='9' fill='rgba(255,255,255,0.4)'>{minVp}px</text>
      <text x={toX(maxVp)} y={H - 4} textAnchor='middle' fontSize='9' fill='rgba(255,255,255,0.4)'>{maxVp}px</text>
    </svg>
  );
}

const PRESETS = [
  { label: 'Body text', minSize: 16, maxSize: 20, minVp: 320, maxVp: 1280, unit: 'rem' as const },
  { label: 'H1 heading', minSize: 32, maxSize: 64, minVp: 320, maxVp: 1280, unit: 'rem' as const },
  { label: 'H2 heading', minSize: 24, maxSize: 40, minVp: 320, maxVp: 1280, unit: 'rem' as const },
  { label: 'Small text', minSize: 12, maxSize: 14, minVp: 320, maxVp: 1280, unit: 'px' as const },
  { label: 'Section padding', minSize: 24, maxSize: 80, minVp: 375, maxVp: 1440, unit: 'px' as const },
  { label: 'Card gap', minSize: 12, maxSize: 24, minVp: 375, maxVp: 1280, unit: 'px' as const },
];

const CSS_PROPERTIES = ['font-size', 'line-height', 'letter-spacing', 'margin', 'padding', 'gap', 'border-radius', 'width', 'height', 'max-width'];

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#f0c674',
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

export default function CSSClampGeneratorPage() {
  const [minSize, setMinSize] = useState(16);
  const [maxSize, setMaxSize] = useState(24);
  const [minVp, setMinVp] = useState(320);
  const [maxVp, setMaxVp] = useState(1280);
  const [unit, setUnit] = useState<'px' | 'rem'>('rem');
  const [rootSize, setRootSize] = useState(16);
  const [cssProp, setCssProp] = useState('font-size');

  const result = generateClamp(minSize, maxSize, minVp, maxVp, unit, rootSize);
  const validationError = minVp >= maxVp ? 'Min viewport must be less than max viewport' : minSize >= maxSize ? 'Min size must be less than max size' : null;

  const applyPreset = (p: typeof PRESETS[0]) => { setMinSize(p.minSize); setMaxSize(p.maxSize); setMinVp(p.minVp); setMaxVp(p.maxVp); setUnit(p.unit); };

  const numInputStyle: React.CSSProperties = {
    width: 80, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)',
    fontFamily: 'inherit', fontSize: 12, padding: '4px 8px', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = { fontSize: 10, color: 'var(--bp-ink-mute)', display: 'block', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' };

  return (
    <div
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='text'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0' style={{ borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>CSS clamp() Generator</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Generate fluid typography and spacing that scales between two viewport sizes</p>
      </div>

      {/* Main 2-col layout */}
      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden' style={{ flex: 1, minHeight: 0, display: 'grid', overflow: 'hidden' }}>

        {/* Left: Controls */}
        <div className='hidden lg:flex flex-col overflow-hidden' style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--bp-border)' }}>
          <Panel title='Presets' style={{ flexShrink: 0 }}>
            <div className='p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3'>
              {PRESETS.map((p) => (
                <button key={p.label} type='button' onClick={() => applyPreset(p)} className='min-h-10 px-3 py-2'
                  style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ color: 'var(--bp-ink-mute)' }}>{p.minSize}–{p.maxSize}px</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title='Parameters' style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Unit selector */}
              <div>
                <span style={labelStyle}>Output Unit</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['rem', 'px'] as const).map((u) => (
                    <button key={u} type='button' onClick={() => setUnit(u)} className='min-h-10 px-3'
                      style={{ height: 26, border: '1px solid var(--bp-border)', background: unit === u ? 'var(--bp-accent)' : 'transparent', color: unit === u ? '#000' : 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer' }}>
                      {u}
                    </button>
                  ))}
                  {unit === 'rem' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Root</span>
                      <input type='number' value={rootSize} onChange={(e) => setRootSize(parseFloat(e.target.value) || 16)} min={10} max={24} style={{ ...numInputStyle, width: 56 }} />
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>px</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Size range */}
              <div>
                <span style={{ ...labelStyle, color: 'var(--bp-accent)' }}>Size Range (px)</span>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                  <div>
                    <label style={labelStyle}>Min Size</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type='number' value={minSize} onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setMinSize(n); }} min={1} max={maxSize - 1} style={numInputStyle} />
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>{unit === 'rem' ? 'px→rem' : 'px'}</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Max Size</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type='number' value={maxSize} onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setMaxSize(n); }} min={minSize + 1} max={500} style={numInputStyle} />
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>{unit === 'rem' ? 'px→rem' : 'px'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Viewport range */}
              <div>
                <span style={{ ...labelStyle, color: 'var(--bp-accent)' }}>Viewport Range (px)</span>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                  <div>
                    <label style={labelStyle}>Min Viewport</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type='number' value={minVp} onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setMinVp(n); }} min={200} max={maxVp - 1} step={10} style={numInputStyle} />
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>px</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Max Viewport</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type='number' value={maxVp} onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setMaxVp(n); }} min={minVp + 1} max={3840} step={10} style={numInputStyle} />
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>px</span>
                    </div>
                  </div>
                </div>
              </div>

              {validationError && (
                <div style={{ fontSize: 11, color: '#f87171', padding: '6px 10px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
                  {validationError}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right: Output */}
        <Panel title='Output'>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result && !validationError ? (
              <>
                {/* Preview curve */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Fluid Scale Preview</div>
                  <PreviewCurve minSize={minSize} maxSize={maxSize} minVp={minVp} maxVp={maxVp} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--bp-ink-faint)', marginTop: 4 }}>
                    <span>Flat at {minSize}px below {minVp}px</span>
                    <span>Flat at {maxSize}px above {maxVp}px</span>
                  </div>
                </div>

                {/* Generated clamp */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Generated clamp()</div>
                  <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3' style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code className='flex-1' style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-accent)', fontSize: 11, padding: '8px 10px', wordBreak: 'break-all', lineHeight: 1.5 }}>{result.clampValue}</code>
                    <BpCopyBtn text={result.clampValue} label='COPY' />
                  </div>
                </div>

                {/* CSS declaration */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>CSS Declaration</div>
                    <select value={cssProp} onChange={(e) => setCssProp(e.target.value)}
                      style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 10, padding: '2px 6px', outline: 'none' }}>
                      {CSS_PROPERTIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'CSS', value: `${cssProp}: ${result.clampValue};` },
                      { label: 'SCSS var', value: `$fluid-${cssProp}: ${result.clampValue};` },
                      { label: 'CSS var', value: `--fluid-${cssProp}: ${result.clampValue};` },
                    ].map(({ label, value }) => (
                      <div key={label} className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3' style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className='text-xs sm:text-xs flex-shrink-0' style={{ fontSize: 9, color: 'var(--bp-ink-faint)', width: 52, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                        <code className='flex-1 break-all' style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontSize: 10, padding: '5px 8px', wordBreak: 'break-all', lineHeight: 1.5 }}>{value}</code>
                        <BpCopyBtn text={value} label='COPY' />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Math breakdown */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Math Breakdown</div>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3'>
                    {[
                      { label: 'Slope', value: result.slope.toFixed(4), desc: `(${maxSize}-${minSize})÷(${maxVp}-${minVp})` },
                      { label: 'Intercept', value: `${result.intercept.toFixed(4)}px`, desc: `${minSize}−slope×${minVp}` },
                      { label: 'Slope vw', value: `${result.slopeVw.toFixed(4)}vw`, desc: 'slope × 100' },
                    ].map(({ label, value, desc }) => (
                      <div key={label} style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, color: 'var(--bp-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{value}</div>
                        <div style={{ fontSize: 9, color: 'var(--bp-ink-faint)' }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Size at common viewports */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Size at Common Viewports</div>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3'>
                    {[320, 375, 480, 768, 1024, 1280, 1440, 1920].map((vp) => {
                      const size = Math.min(maxSize, Math.max(minSize, minSize + result.slope * (vp - minVp)));
                      const inRange = vp >= minVp && vp <= maxVp;
                      return (
                        <div key={vp} style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--bp-ink-faint)' }}>{vp}px</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: inRange ? '#fff' : 'var(--bp-ink-mute)' }}>{size.toFixed(1)}px</div>
                          {unit === 'rem' && <div style={{ fontSize: 9, color: 'var(--bp-ink-faint)' }}>{(size / rootSize).toFixed(3)}rem</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--bp-ink-faint)', fontSize: 11, flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 22, opacity: 0.3 }}>f(x)</span>
                <span>{validationError ?? 'Configure parameters to generate clamp()'}</span>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
