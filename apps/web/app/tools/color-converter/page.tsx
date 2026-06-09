'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { AlertCircle } from 'lucide-react';

interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }
interface OKLCH { l: number; c: number; h: number }

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}

function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: +(l * 100).toFixed(1) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: +(h * 360).toFixed(1), s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100;
  if (sn === 0) { const v = Math.round(ln * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = h / 360;
  return { r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255), g: Math.round(hue2rgb(p, q, hn) * 255), b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255) };
}

function linearize(c: number): number {
  const cn = c / 255;
  return cn <= 0.04045 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4);
}

function rgbToOklch({ r, g, b }: RGB): OKLCH {
  const lr = linearize(r), lg = linearize(g), lb = linearize(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const c = Math.sqrt(a * a + bb * bb);
  let h = Math.atan2(bb, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { l: +L.toFixed(4), c: +c.toFixed(4), h: +h.toFixed(2) };
}

function oklchToRgb({ l, c, h }: OKLCH): RGB {
  const hRad = h * (Math.PI / 180);
  const a = c * Math.cos(hRad), b = c * Math.sin(hRad);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  const lv = l_ * l_ * l_, mv = m_ * m_ * m_, sv = s_ * s_ * s_;
  const lr = +4.0767416621 * lv - 3.3077115913 * mv + 0.2309699292 * sv;
  const lg = -1.2684380046 * lv + 2.6097574011 * mv - 0.3413193965 * sv;
  const lb2 = -0.0041960863 * lv - 0.7034186147 * mv + 1.7076147010 * sv;
  const gamma = (c2: number) => c2 <= 0 ? 0 : c2 >= 1 ? 255 : Math.round((c2 <= 0.0031308 ? 12.92 * c2 : 1.055 * Math.pow(c2, 1 / 2.4) - 0.055) * 255);
  return { r: gamma(lr), g: gamma(lg), b: gamma(lb2) };
}

function parseColor(input: string): { rgb: RGB; format: string } | null {
  const s = input.trim();
  if (s.startsWith('#') || /^[0-9a-f]{3,6}$/i.test(s)) {
    const rgb = hexToRgb(s.startsWith('#') ? s : '#' + s);
    if (rgb) return { rgb, format: 'hex' };
  }
  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)[,\s]+\s*([\d.]+)[,\s]+\s*([\d.]+)/i);
  if (rgbMatch) {
    const r = Math.round(+rgbMatch[1]), g = Math.round(+rgbMatch[2]), b = Math.round(+rgbMatch[3]);
    if ([r, g, b].every(v => v >= 0 && v <= 255)) return { rgb: { r, g, b }, format: 'rgb' };
  }
  const hslMatch = s.match(/^hsla?\(\s*([\d.]+)[,\s]+\s*([\d.]+)%?[,\s]+\s*([\d.]+)%?/i);
  if (hslMatch) {
    const h = +hslMatch[1], sl = +hslMatch[2], l = +hslMatch[3];
    if (h >= 0 && h <= 360 && sl >= 0 && sl <= 100 && l >= 0 && l <= 100) return { rgb: hslToRgb({ h, s: sl, l }), format: 'hsl' };
  }
  const oklchMatch = s.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/i);
  if (oklchMatch) {
    const lv = +oklchMatch[1];
    return { rgb: oklchToRgb({ l: lv > 1 ? lv / 100 : lv, c: +oklchMatch[2], h: +oklchMatch[3] }), format: 'oklch' };
  }
  const NAMED: Record<string, string> = { red: '#ff0000', green: '#008000', blue: '#0000ff', white: '#ffffff', black: '#000000', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080', grey: '#808080', lime: '#00ff00', navy: '#000080', teal: '#008080' };
  if (NAMED[s.toLowerCase()]) { const rgb = hexToRgb(NAMED[s.toLowerCase()]); if (rgb) return { rgb, format: 'hex' }; }
  return null;
}

const PRESETS = [
  { label: 'Tailwind Blue 500', hex: '#3b82f6' },
  { label: 'Tailwind Red 500', hex: '#ef4444' },
  { label: 'Tailwind Green 500', hex: '#22c55e' },
  { label: 'Tailwind Purple 500', hex: '#a855f7' },
  { label: 'Tailwind Amber 400', hex: '#fbbf24' },
  { label: 'Tailwind Slate 900', hex: '#0f172a' },
];

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

export default function ColorConverterPage() {
  const [input, setInput] = useState('#3b82f6');

  const parsed = parseColor(input);
  const rgb = parsed?.rgb ?? null;

  const { h: hsl_h, s: hsl_s } = rgb ? rgbToHsl(rgb) : { h: 0, s: 0 };

  const outputs = rgb ? [
    { label: 'HEX', value: rgbToHex(rgb), key: 'hex' },
    { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, key: 'rgb' },
    { label: 'HSL', value: (() => { const { h, s, l } = rgbToHsl(rgb); return `hsl(${h}, ${s}%, ${l}%)`; })(), key: 'hsl' },
    { label: 'OKLCH', value: (() => { const { l, c, h } = rgbToOklch(rgb); return `oklch(${l} ${c} ${h})`; })(), key: 'oklch' },
  ] : [];

  const cssStr = rgb ? rgbToHex(rgb) : 'transparent';
  const luminance = rgb ? (0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b)) : 0;
  const contrastOnWhite = 1.05 / (luminance + 0.05);
  const contrastOnBlack = (luminance + 0.05) / 0.05;
  const bestContrast = contrastOnWhite > contrastOnBlack ? 'white' : 'black';

  return (
    <div
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='data'
      style={{
        ...CSS_VARS,
        background: 'var(--bp-bg)',
        color: 'var(--bp-ink)',
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 2 }}>Color Converter</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Convert between HEX, RGB, HSL and other color formats</p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Color Input Panel */}
        <Panel title='Color Input'>
          <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{
                width: 56, height: 56, border: '2px solid var(--bp-border-str)',
                backgroundColor: cssStr, cursor: 'pointer',
              }} />
              <input
                type='color'
                value={rgb ? rgbToHex(rgb) : '#000000'}
                onChange={(e) => setInput(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
            </label>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='#3b82f6 · rgb(59,130,246) · hsl(217,91%,60%)'
                style={{
                  flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)',
                  color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12,
                  padding: '7px 10px', outline: 'none', boxSizing: 'border-box',
                  width: '100%',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)' }}>Accepts HEX, RGB, HSL, OKLCH, or CSS color names</span>
            </div>
          </div>
        </Panel>

        {/* Presets Panel */}
        <Panel title='Presets'>
          <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map((p) => (
              <button
                key={p.hex}
                onClick={() => setInput(p.hex)}
                type='button'
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', border: '1px solid var(--bp-border)',
                  background: 'var(--bp-elevated)', cursor: 'pointer',
                  color: 'var(--bp-ink)', fontSize: 11, fontFamily: 'inherit',
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: p.hex, flexShrink: 0 }} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </Panel>

        {/* Error state */}
        {input.trim() && !rgb && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', fontSize: 12 }}>
            <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>Could not parse color — try #rrggbb, rgb(r,g,b), hsl(h,s%,l%), or oklch(L C H)</span>
          </div>
        )}

        {rgb && (
          <>
            {/* Color Preview */}
            <div style={{ height: 80, width: '100%', display: 'flex', alignItems: 'flex-end', padding: '10px 14px', backgroundColor: cssStr, boxSizing: 'border-box', border: '1px solid var(--bp-border)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{
                  fontSize: 11, padding: '3px 8px', fontFamily: 'inherit',
                  backgroundColor: bestContrast === 'white' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
                  color: bestContrast === 'white' ? '#fff' : '#000',
                }}>Aa</span>
                <span style={{
                  fontSize: 11, padding: '3px 8px', fontFamily: 'inherit',
                  backgroundColor: bestContrast === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                  color: bestContrast === 'white' ? '#fff' : '#000',
                }}>{cssStr}</span>
              </div>
            </div>

            {/* All Formats Panel */}
            <Panel title='All Formats'>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {outputs.map(({ label, value, key }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', width: 44, flexShrink: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
                    <code
                      onClick={() => setInput(value)}
                      title='Click to use as input'
                      style={{
                        flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)',
                        color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12,
                        padding: '6px 10px', cursor: 'pointer', boxSizing: 'border-box',
                      }}
                    >{value}</code>
                    <BpCopyBtn text={value} label='COPY' />
                  </div>
                ))}
              </div>
            </Panel>

            {/* Contrast (WCAG) Panel */}
            <Panel title='Contrast (WCAG)'>
              <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ bg: '#ffffff', label: 'on White', ratio: contrastOnWhite }, { bg: '#000000', label: 'on Black', ratio: contrastOnBlack }].map(({ bg, label, ratio }) => {
                  const aa = ratio >= 4.5, aaa = ratio >= 7, aaLarge = ratio >= 3;
                  return (
                    <div key={label} style={{ background: 'var(--bp-elevated)', border: '1px solid var(--bp-border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, backgroundColor: bg, color: cssStr }}>
                        Aa {label}
                      </div>
                      <p style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{ratio.toFixed(2)}:1</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', fontFamily: 'inherit', background: aaa ? 'rgba(74,210,154,0.15)' : 'rgba(239,68,68,0.1)', color: aaa ? '#4ad29a' : '#f87171' }}>AAA</span>
                        <span style={{ fontSize: 10, padding: '2px 6px', fontFamily: 'inherit', background: aa ? 'rgba(74,210,154,0.15)' : 'rgba(239,68,68,0.1)', color: aa ? '#4ad29a' : '#f87171' }}>AA</span>
                        <span style={{ fontSize: 10, padding: '2px 6px', fontFamily: 'inherit', background: aaLarge ? 'rgba(74,210,154,0.15)' : 'rgba(239,68,68,0.1)', color: aaLarge ? '#4ad29a' : '#f87171' }}>AA Large</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Lightness Scale Panel */}
            <Panel title='Lightness Scale'>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((l) => {
                    const shadeHex = rgbToHex(hslToRgb({ h: hsl_h, s: hsl_s, l }));
                    return (
                      <button
                        key={l}
                        onClick={() => setInput(shadeHex)}
                        title={`L=${l}% → ${shadeHex}`}
                        type='button'
                        style={{
                          flex: 1, height: 36, border: 'none', cursor: 'pointer',
                          backgroundColor: shadeHex,
                        }}
                      />
                    );
                  })}
                </div>
                <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)' }}>Click a shade to use it as input</span>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
