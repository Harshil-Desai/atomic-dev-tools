'use client';

import { useState } from 'react';
import { Button, Card, CardContent } from '@/ui';
import { Sliders, Copy, Check } from 'lucide-react';

// ─── clamp math ───────────────────────────────────────────────────────────────

interface ClampResult {
  clampValue: string;
  slope: number;
  intercept: number;
  slopeVw: number;
  preferredCalc: string;
}

function generateClamp(
  minSize: number,
  maxSize: number,
  minVp: number,
  maxVp: number,
  unit: 'px' | 'rem',
  rootSize: number,
): ClampResult | null {
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
    return {
      clampValue: `clamp(${minRem}rem, calc(${preferred}), ${maxRem}rem)`,
      slope,
      intercept,
      slopeVw,
      preferredCalc: preferred,
    };
  }

  // px
  const interceptStr = intercept.toFixed(4).replace(/\.?0+$/, '');
  const slopeStr = slopeVw.toFixed(4).replace(/\.?0+$/, '');
  const preferred = `${interceptStr}px + ${slopeStr}vw`;
  return {
    clampValue: `clamp(${minSize}px, calc(${preferred}), ${maxSize}px)`,
    slope,
    intercept,
    slopeVw,
    preferredCalc: preferred,
  };
}

// ─── preview curve ────────────────────────────────────────────────────────────

function PreviewCurve({
  minSize, maxSize, minVp, maxVp,
}: { minSize: number; maxSize: number; minVp: number; maxVp: number }) {
  const W = 320;
  const H = 100;
  const pad = 20;

  // Map viewport → x, size → y
  const vpMin = 200, vpMax = 1800;
  const sMin = Math.min(minSize, maxSize) * 0.8;
  const sMax = Math.max(minSize, maxSize) * 1.2;

  const toX = (vp: number) => pad + ((vp - vpMin) / (vpMax - vpMin)) * (W - 2 * pad);
  const toY = (s: number) => (H - pad) - ((s - sMin) / (sMax - sMin)) * (H - 2 * pad);

  const clampedSize = (vp: number) => Math.min(maxSize, Math.max(minSize,
    minSize + ((maxSize - minSize) / (maxVp - minVp)) * (vp - minVp)
  ));

  const points: string[] = [];
  for (let vp = vpMin; vp <= vpMax; vp += 20) {
    points.push(`${toX(vp)},${toY(clampedSize(vp))}`);
  }

  const x1 = toX(minVp), x2 = toX(maxVp);
  const y1 = toY(minSize), y2 = toY(maxSize);

  return (
    <svg width={W} height={H} className='w-full rounded'>
      {/* Background */}
      <rect width={W} height={H} fill='#121212' rx='6' />
      {/* Grid lines */}
      {[minVp, maxVp].map((vp) => (
        <line key={vp} x1={toX(vp)} y1={pad / 2} x2={toX(vp)} y2={H - pad / 2}
          stroke='hsla(0,0%,30%,1)' strokeWidth='1' strokeDasharray='3,3' />
      ))}
      {/* Flat min/max lines */}
      <line x1={pad} y1={toY(minSize)} x2={toX(minVp)} y2={toY(minSize)}
        stroke='hsla(142,70%,45%,0.4)' strokeWidth='1.5' />
      <line x1={toX(maxVp)} y1={toY(maxSize)} x2={W - pad} y2={toY(maxSize)}
        stroke='hsla(142,70%,45%,0.4)' strokeWidth='1.5' />
      {/* Ramp line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke='hsla(217,91%,60%,0.8)' strokeWidth='2' />
      {/* Full curve */}
      <polyline points={points.join(' ')} fill='none'
        stroke='hsla(142,70%,45%,1)' strokeWidth='2' />
      {/* Dots */}
      <circle cx={x1} cy={y1} r='4' fill='hsla(217,91%,60%,1)' />
      <circle cx={x2} cy={y2} r='4' fill='hsla(217,91%,60%,1)' />
      {/* Labels */}
      <text x={toX(minVp)} y={H - 4} textAnchor='middle' fontSize='9' fill='hsla(0,0%,50%,1)'>{minVp}px</text>
      <text x={toX(maxVp)} y={H - 4} textAnchor='middle' fontSize='9' fill='hsla(0,0%,50%,1)'>{maxVp}px</text>
    </svg>
  );
}

// ─── presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Body text', minSize: 16, maxSize: 20, minVp: 320, maxVp: 1280, unit: 'rem' as const },
  { label: 'H1 heading', minSize: 32, maxSize: 64, minVp: 320, maxVp: 1280, unit: 'rem' as const },
  { label: 'H2 heading', minSize: 24, maxSize: 40, minVp: 320, maxVp: 1280, unit: 'rem' as const },
  { label: 'Small text', minSize: 12, maxSize: 14, minVp: 320, maxVp: 1280, unit: 'px' as const },
  { label: 'Section padding', minSize: 24, maxSize: 80, minVp: 375, maxVp: 1440, unit: 'px' as const },
  { label: 'Card gap', minSize: 12, maxSize: 24, minVp: 375, maxVp: 1280, unit: 'px' as const },
];

const CSS_PROPERTIES = [
  'font-size', 'line-height', 'letter-spacing', 'margin', 'padding',
  'gap', 'border-radius', 'width', 'height', 'max-width',
];

// ─── component ────────────────────────────────────────────────────────────────

export default function CSSClampGeneratorPage() {
  const [minSize, setMinSize] = useState(16);
  const [maxSize, setMaxSize] = useState(24);
  const [minVp, setMinVp] = useState(320);
  const [maxVp, setMaxVp] = useState(1280);
  const [unit, setUnit] = useState<'px' | 'rem'>('rem');
  const [rootSize, setRootSize] = useState(16);
  const [cssProp, setCssProp] = useState('font-size');
  const [copied, setCopied] = useState<string | null>(null);

  const result = generateClamp(minSize, maxSize, minVp, maxVp, unit, rootSize);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setMinSize(p.minSize);
    setMaxSize(p.maxSize);
    setMinVp(p.minVp);
    setMaxVp(p.maxVp);
    setUnit(p.unit);
  };

  const NumInput = ({ label, value, onChange, min, max, step = 1 }: {
    label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number;
  }) => (
    <div>
      <label className='block text-xs text-gray-400 mb-1'>{label}</label>
      <div className='flex gap-1 items-center'>
        <input
          type='number'
          value={value}
          onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n); }}
          min={min} max={max} step={step}
          className='w-24 h-9 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <span className='text-xs text-gray-500'>{unit === 'rem' && label.includes('Size') ? 'px→rem' : label.includes('Viewport') ? 'px' : unit}</span>
      </div>
    </div>
  );

  const validationError = minVp >= maxVp
    ? 'Min viewport must be less than max viewport'
    : minSize >= maxSize
    ? 'Min size must be less than max size'
    : null;

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>CSS clamp() Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate fluid typography and spacing that scales smoothly between two viewport sizes</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          {/* Presets */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Presets</p>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {PRESETS.map((p) => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className='text-left rounded-md px-3 py-2 bg-[#121212] hover:bg-[#222] border border-[hsla(0,0%,20%,1)] transition-colors'>
                    <p className='text-xs text-gray-300 font-medium mb-0.5'>{p.label}</p>
                    <p className='text-xs text-gray-500 font-mono'>{p.minSize}–{p.maxSize}{p.unit === 'rem' ? 'px' : 'px'}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inputs */}
          <Card>
            <CardContent className='pt-6 space-y-5'>
              <div className='flex gap-4 items-end flex-wrap'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Output Unit</label>
                  <div className='flex gap-2'>
                    <Button size='sm' variant={unit === 'rem' ? 'default' : 'outline'} onClick={() => setUnit('rem')}>rem</Button>
                    <Button size='sm' variant={unit === 'px' ? 'default' : 'outline'} onClick={() => setUnit('px')}>px</Button>
                  </div>
                </div>
                {unit === 'rem' && (
                  <div>
                    <label className='block text-xs text-gray-400 mb-1'>Root font size</label>
                    <div className='flex items-center gap-1'>
                      <input type='number' value={rootSize} onChange={(e) => setRootSize(parseFloat(e.target.value) || 16)}
                        min={10} max={24}
                        className='w-16 h-9 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm font-mono focus:outline-none' />
                      <span className='text-xs text-gray-500'>px</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className='text-xs text-gray-400 uppercase tracking-wide mb-3'>Size Range (px)</p>
                <div className='grid grid-cols-2 gap-4'>
                  <NumInput label='Min Size' value={minSize} onChange={setMinSize} min={1} max={maxSize - 1} />
                  <NumInput label='Max Size' value={maxSize} onChange={setMaxSize} min={minSize + 1} max={500} />
                </div>
              </div>

              <div>
                <p className='text-xs text-gray-400 uppercase tracking-wide mb-3'>Viewport Range (px)</p>
                <div className='grid grid-cols-2 gap-4'>
                  <NumInput label='Min Viewport' value={minVp} onChange={setMinVp} min={200} max={maxVp - 1} step={10} />
                  <NumInput label='Max Viewport' value={maxVp} onChange={setMaxVp} min={minVp + 1} max={3840} step={10} />
                </div>
              </div>

              {validationError && (
                <p className='text-sm text-red-400'>{validationError}</p>
              )}
            </CardContent>
          </Card>

          {/* Preview curve */}
          {result && !validationError && (
            <Card>
              <CardContent className='pt-6 space-y-3'>
                <p className='text-xs text-gray-500 uppercase tracking-wide'>Fluid Scale Preview</p>
                <PreviewCurve minSize={minSize} maxSize={maxSize} minVp={minVp} maxVp={maxVp} />
                <div className='flex justify-between text-xs text-gray-500 px-1'>
                  <span>Flat at {minSize}px below {minVp}px viewport</span>
                  <span>Flat at {maxSize}px above {maxVp}px viewport</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Output */}
          {result && !validationError && (
            <>
              <Card>
                <CardContent className='pt-6 space-y-3'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Generated clamp()</p>
                  <div className='flex items-center gap-2'>
                    <code className='flex-1 bg-[#121212] rounded-md px-4 py-3 font-mono text-sm text-green-400 break-all'>
                      {result.clampValue}
                    </code>
                    <Button variant='outline' size='sm' className='shrink-0' onClick={() => handleCopy(result.clampValue, 'clamp')}>
                      {copied === 'clamp' ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* CSS snippets */}
              <Card>
                <CardContent className='pt-6 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <p className='text-xs text-gray-500 uppercase tracking-wide'>CSS Declaration</p>
                    <select
                      value={cssProp}
                      onChange={(e) => setCssProp(e.target.value)}
                      className='h-7 px-2 text-xs rounded border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-300 focus:outline-none'
                    >
                      {CSS_PROPERTIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  {[
                    { label: 'CSS', value: `${cssProp}: ${result.clampValue};` },
                    { label: 'SCSS var', value: `$fluid-${cssProp}: ${result.clampValue};` },
                    { label: 'CSS custom property', value: `--fluid-${cssProp}: ${result.clampValue};` },
                  ].map(({ label, value }) => (
                    <div key={label} className='flex items-center gap-2'>
                      <span className='text-xs text-gray-500 w-28 shrink-0'>{label}</span>
                      <code className='flex-1 bg-[#121212] rounded px-3 py-1.5 font-mono text-xs text-gray-300 break-all'>{value}</code>
                      <Button variant='outline' size='sm' onClick={() => handleCopy(value, label)}>
                        {copied === label ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Math breakdown */}
              <Card>
                <CardContent className='pt-6 space-y-2'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Math Breakdown</p>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    {[
                      {
                        label: 'Slope',
                        value: result.slope.toFixed(4),
                        desc: `(${maxSize} - ${minSize}) ÷ (${maxVp} - ${minVp})`,
                      },
                      {
                        label: 'Intercept',
                        value: `${result.intercept.toFixed(4)}px`,
                        desc: `${minSize} − slope × ${minVp}`,
                      },
                      {
                        label: 'Slope as vw',
                        value: `${result.slopeVw.toFixed(4)}vw`,
                        desc: 'slope × 100',
                      },
                    ].map(({ label, value, desc }) => (
                      <div key={label} className='bg-[#121212] rounded-lg p-3'>
                        <p className='text-xs text-gray-500 mb-1'>{label}</p>
                        <p className='font-mono text-sm font-bold text-white'>{value}</p>
                        <p className='text-xs text-gray-600 mt-1 font-mono'>{desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Size at viewport samples */}
              <Card>
                <CardContent className='pt-6 space-y-2'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Size at Common Viewports</p>
                  <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
                    {[320, 375, 480, 768, 1024, 1280, 1440, 1920].map((vp) => {
                      const size = Math.min(maxSize, Math.max(minSize, minSize + result.slope * (vp - minVp)));
                      const inRange = vp >= minVp && vp <= maxVp;
                      return (
                        <div key={vp} className='bg-[#121212] rounded p-2 text-center'>
                          <p className='text-xs text-gray-500'>{vp}px</p>
                          <p className={`font-mono text-sm font-bold ${inRange ? 'text-white' : 'text-gray-500'}`}>
                            {size.toFixed(1)}{unit === 'px' ? 'px' : 'px'}
                          </p>
                          {unit === 'rem' && (
                            <p className='font-mono text-xs text-gray-600'>{(size / rootSize).toFixed(3)}rem</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
