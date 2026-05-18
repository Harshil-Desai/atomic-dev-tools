'use client';

import { useState, useCallback } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';
import { Palette, Copy, Check, AlertCircle } from 'lucide-react';

// ─── color math ───────────────────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }
interface OKLCH { l: number; c: number; h: number }

// Hex ↔ RGB
function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

// RGB ↔ HSL
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
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = h / 360;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

// RGB → OKLCH (via linear RGB → XYZ → OKLab → OKLCH)
function linearize(c: number): number {
  const cn = c / 255;
  return cn <= 0.04045 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4);
}

function rgbToOklch({ r, g, b }: RGB): OKLCH {
  const lr = linearize(r), lg = linearize(g), lb = linearize(b);
  // Linear RGB → LMS (Oklab M1)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  // Cube root
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  // LMS → OKLab (M2)
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  // OKLab → OKLCH
  const c = Math.sqrt(a * a + bb * bb);
  let h = Math.atan2(bb, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { l: +L.toFixed(4), c: +c.toFixed(4), h: +h.toFixed(2) };
}

function oklchToRgb({ l, c, h }: OKLCH): RGB {
  const hRad = h * (Math.PI / 180);
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  // OKLab → LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  const lv = l_ * l_ * l_, mv = m_ * m_ * m_, sv = s_ * s_ * s_;
  // LMS → linear RGB
  const lr = +4.0767416621 * lv - 3.3077115913 * mv + 0.2309699292 * sv;
  const lg = -1.2684380046 * lv + 2.6097574011 * mv - 0.3413193965 * sv;
  const lb = -0.0041960863 * lv - 0.7034186147 * mv + 1.7076147010 * sv;
  // Linear → gamma
  const gamma = (c: number) => {
    if (c <= 0) return 0;
    if (c >= 1) return 255;
    return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  };
  return { r: gamma(lr), g: gamma(lg), b: gamma(lb) };
}

// ─── parsers ──────────────────────────────────────────────────────────────────

type Format = 'hex' | 'rgb' | 'hsl' | 'oklch';

function parseColor(input: string): { rgb: RGB; format: Format } | null {
  const s = input.trim();

  // Hex
  if (s.startsWith('#') || /^[0-9a-f]{3,6}$/i.test(s)) {
    const rgb = hexToRgb(s.startsWith('#') ? s : '#' + s);
    if (rgb) return { rgb, format: 'hex' };
  }

  // rgb(r, g, b) or rgb(r g b)
  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)[,\s]+\s*([\d.]+)[,\s]+\s*([\d.]+)/i);
  if (rgbMatch) {
    const r = Math.round(+rgbMatch[1]), g = Math.round(+rgbMatch[2]), b = Math.round(+rgbMatch[3]);
    if ([r, g, b].every(v => v >= 0 && v <= 255)) return { rgb: { r, g, b }, format: 'rgb' };
  }

  // hsl(h, s%, l%) or hsl(h s% l%)
  const hslMatch = s.match(/^hsla?\(\s*([\d.]+)[,\s]+\s*([\d.]+)%?[,\s]+\s*([\d.]+)%?/i);
  if (hslMatch) {
    const h = +hslMatch[1], sl = +hslMatch[2], l = +hslMatch[3];
    if (h >= 0 && h <= 360 && sl >= 0 && sl <= 100 && l >= 0 && l <= 100) {
      return { rgb: hslToRgb({ h, s: sl, l }), format: 'hsl' };
    }
  }

  // oklch(L C H)
  const oklchMatch = s.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/i);
  if (oklchMatch) {
    const lv = +oklchMatch[1], cv = +oklchMatch[2], hv = +oklchMatch[3];
    const l = lv > 1 ? lv / 100 : lv;
    return { rgb: oklchToRgb({ l, c: cv, h: hv }), format: 'oklch' };
  }

  // Named colors — a small subset
  const NAMED: Record<string, string> = {
    red: '#ff0000', green: '#008000', blue: '#0000ff', white: '#ffffff',
    black: '#000000', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
    orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080',
    grey: '#808080', lime: '#00ff00', navy: '#000080', teal: '#008080',
  };
  if (NAMED[s.toLowerCase()]) {
    const rgb = hexToRgb(NAMED[s.toLowerCase()]);
    if (rgb) return { rgb, format: 'hex' };
  }

  return null;
}

// ─── format display strings ───────────────────────────────────────────────────

function formatHex(rgb: RGB): string { return rgbToHex(rgb); }
function formatRGB(rgb: RGB): string { return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`; }
function formatHSL(rgb: RGB): string {
  const { h, s, l } = rgbToHsl(rgb);
  return `hsl(${h}, ${s}%, ${l}%)`;
}
function formatOKLCH(rgb: RGB): string {
  const { l, c, h } = rgbToOklch(rgb);
  return `oklch(${l} ${c} ${h})`;
}

// ─── presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Tailwind Blue 500', hex: '#3b82f6' },
  { label: 'Tailwind Red 500', hex: '#ef4444' },
  { label: 'Tailwind Green 500', hex: '#22c55e' },
  { label: 'Tailwind Purple 500', hex: '#a855f7' },
  { label: 'Tailwind Amber 400', hex: '#fbbf24' },
  { label: 'Tailwind Slate 900', hex: '#0f172a' },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function ColorConverterPage() {
  const [input, setInput] = useState('#3b82f6');
  const [copied, setCopied] = useState<string | null>(null);

  const parsed = parseColor(input);
  const rgb = parsed?.rgb ?? null;

  const outputs = rgb ? [
    { label: 'HEX', value: formatHex(rgb), key: 'hex' },
    { label: 'RGB', value: formatRGB(rgb), key: 'rgb' },
    { label: 'HSL', value: formatHSL(rgb), key: 'hsl' },
    { label: 'OKLCH', value: formatOKLCH(rgb), key: 'oklch' },
  ] : [];

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const cssStr = rgb ? rgbToHex(rgb) : 'transparent';

  // Color contrast info
  const luminance = rgb ? (0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b)) : 0;
  const contrastOnWhite = (1.05) / (luminance + 0.05);
  const contrastOnBlack = (luminance + 0.05) / 0.05;
  const bestContrast = contrastOnWhite > contrastOnBlack ? 'white' : 'black';

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Color Format Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert between HEX, RGB, HSL, and OKLCH with live preview and contrast info</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-2xl mx-auto space-y-4'>

          {/* Input + swatch */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <label className='block text-sm font-medium text-gray-300'>Color Input</label>
              <div className='flex gap-3 items-center'>
                {/* Clickable color picker */}
                <label className='relative cursor-pointer shrink-0'>
                  <div
                    className='w-14 h-14 rounded-xl border-2 border-[hsla(0,0%,30%,1)] shadow-lg transition-transform hover:scale-105'
                    style={{ backgroundColor: cssStr }}
                  />
                  <input
                    type='color'
                    value={rgb ? rgbToHex(rgb) : '#000000'}
                    onChange={(e) => setInput(e.target.value)}
                    className='absolute inset-0 opacity-0 cursor-pointer w-full h-full'
                  />
                </label>
                <div className='flex-1'>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='#3b82f6 · rgb(59,130,246) · hsl(217,91%,60%) · oklch(0.6 0.2 264)'
                    className='font-mono'
                  />
                  <p className='text-xs text-gray-500 mt-1'>Accepts HEX, RGB, HSL, OKLCH, or CSS color names</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presets */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Presets</p>
              <div className='flex flex-wrap gap-2'>
                {PRESETS.map((p) => (
                  <button key={p.hex} onClick={() => setInput(p.hex)}
                    className='flex items-center gap-2 px-3 py-1.5 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#121212] hover:bg-[#222] transition-colors'>
                    <div className='w-4 h-4 rounded-full shrink-0' style={{ backgroundColor: p.hex }} />
                    <span className='text-xs text-gray-300'>{p.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {input.trim() && !rgb && (
            <Card className='border-red-500/40'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-2 text-red-400'>
                  <AlertCircle className='w-4 h-4 shrink-0' />
                  <span className='text-sm'>Could not parse color — try #rrggbb, rgb(r,g,b), hsl(h,s%,l%), or oklch(L C H)</span>
                </div>
              </CardContent>
            </Card>
          )}

          {rgb && (
            <>
              {/* Color preview */}
              <div
                className='rounded-xl h-28 w-full flex items-end p-4 transition-colors'
                style={{ backgroundColor: cssStr }}
              >
                <div className='flex gap-2'>
                  <span className='text-xs px-2 py-1 rounded font-mono'
                    style={{ backgroundColor: bestContrast === 'white' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', color: bestContrast === 'white' ? '#fff' : '#000' }}>
                    Aa
                  </span>
                  <span className='text-xs px-2 py-1 rounded font-mono'
                    style={{ backgroundColor: bestContrast === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', color: bestContrast === 'white' ? '#fff' : '#000' }}>
                    {cssStr}
                  </span>
                </div>
              </div>

              {/* Outputs */}
              <Card>
                <CardContent className='pt-6 space-y-3'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>All Formats</p>
                  {outputs.map(({ label, value, key }) => (
                    <div key={key} className='flex items-center gap-3'>
                      <span className='text-xs font-mono text-gray-500 w-14 shrink-0'>{label}</span>
                      <code
                        className='flex-1 bg-[#121212] rounded px-3 py-2 font-mono text-sm text-gray-200 cursor-pointer hover:bg-[#1a1a1a] transition-colors'
                        onClick={() => setInput(value)}
                        title='Click to use as input'
                      >
                        {value}
                      </code>
                      <Button variant='outline' size='sm' onClick={() => handleCopy(value, key)}>
                        {copied === key ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Contrast */}
              <Card>
                <CardContent className='pt-6 space-y-3'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Contrast (WCAG)</p>
                  <div className='grid grid-cols-2 gap-3'>
                    {[
                      { bg: '#ffffff', label: 'on White', ratio: contrastOnWhite },
                      { bg: '#000000', label: 'on Black', ratio: contrastOnBlack },
                    ].map(({ bg, label, ratio }) => {
                      const aa = ratio >= 4.5, aaa = ratio >= 7, aaLarge = ratio >= 3;
                      return (
                        <div key={label} className='bg-[#121212] rounded-lg p-3 space-y-2'>
                          <div className='h-8 rounded flex items-center justify-center font-semibold text-sm'
                            style={{ backgroundColor: bg, color: cssStr }}>
                            Aa {label}
                          </div>
                          <p className='font-mono text-sm font-bold text-white'>{ratio.toFixed(2)}:1</p>
                          <div className='flex gap-1 flex-wrap'>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${aaa ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-500'}`}>AAA</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${aa ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-500'}`}>AA</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${aaLarge ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-500'}`}>AA Large</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Shades */}
              <Card>
                <CardContent className='pt-6 space-y-3'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Lightness Scale</p>
                  <div className='flex gap-1'>
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((l) => {
                      const { h, s } = rgbToHsl(rgb);
                      const shadeRgb = hslToRgb({ h, s, l });
                      const hex = rgbToHex(shadeRgb);
                      return (
                        <button key={l} onClick={() => setInput(hex)} title={`L=${l}% → ${hex}`}
                          className='flex-1 h-10 rounded transition-transform hover:scale-110 hover:z-10'
                          style={{ backgroundColor: hex }} />
                      );
                    })}
                  </div>
                  <p className='text-xs text-gray-600'>Click a shade to use it as input</p>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
