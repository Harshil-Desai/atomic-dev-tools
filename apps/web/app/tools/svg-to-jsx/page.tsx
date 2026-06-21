'use client';

import { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { FileCode, AlertCircle } from 'lucide-react';

const ATTR_RENAME: Record<string, string> = {
  'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'accesskey': 'accessKey',
  'contenteditable': 'contentEditable', 'crossorigin': 'crossOrigin', 'enctype': 'encType',
  'formaction': 'formAction', 'formenctype': 'formEncType', 'formmethod': 'formMethod',
  'formnovalidate': 'formNoValidate', 'formtarget': 'formTarget', 'novalidate': 'noValidate',
  'readonly': 'readOnly', 'spellcheck': 'spellCheck', 'srcdoc': 'srcDoc', 'srclang': 'srcLang',
  'srcset': 'srcSet', 'usemap': 'useMap', 'xlink:href': 'href', 'xlink:title': 'title',
  'xlink:show': 'xlinkShow', 'xml:lang': 'xmlLang', 'xml:space': 'xmlSpace',
};

const SVG_HYPHENATED: Record<string, string> = {
  'accent-height': 'accentHeight', 'alignment-baseline': 'alignmentBaseline', 'arabic-form': 'arabicForm',
  'baseline-shift': 'baselineShift', 'cap-height': 'capHeight', 'clip-path': 'clipPath',
  'clip-rule': 'clipRule', 'color-interpolation': 'colorInterpolation', 'color-interpolation-filters': 'colorInterpolationFilters',
  'color-profile': 'colorProfile', 'color-rendering': 'colorRendering', 'dominant-baseline': 'dominantBaseline',
  'enable-background': 'enableBackground', 'fill-opacity': 'fillOpacity', 'fill-rule': 'fillRule',
  'flood-color': 'floodColor', 'flood-opacity': 'floodOpacity', 'font-family': 'fontFamily',
  'font-size': 'fontSize', 'font-size-adjust': 'fontSizeAdjust', 'font-stretch': 'fontStretch',
  'font-style': 'fontStyle', 'font-variant': 'fontVariant', 'font-weight': 'fontWeight',
  'glyph-name': 'glyphName', 'glyph-orientation-horizontal': 'glyphOrientationHorizontal',
  'glyph-orientation-vertical': 'glyphOrientationVertical', 'horiz-adv-x': 'horizAdvX',
  'horiz-origin-x': 'horizOriginX', 'image-rendering': 'imageRendering', 'letter-spacing': 'letterSpacing',
  'lighting-color': 'lightingColor', 'marker-end': 'markerEnd', 'marker-mid': 'markerMid',
  'marker-start': 'markerStart', 'overline-position': 'overlinePosition', 'overline-thickness': 'overlineThickness',
  'paint-order': 'paintOrder', 'panose-1': 'panose1', 'pointer-events': 'pointerEvents',
  'rendering-intent': 'renderingIntent', 'shape-rendering': 'shapeRendering', 'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity', 'strikethrough-position': 'strikethroughPosition',
  'strikethrough-thickness': 'strikethroughThickness', 'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit', 'stroke-opacity': 'strokeOpacity', 'stroke-width': 'strokeWidth',
  'text-anchor': 'textAnchor', 'text-decoration': 'textDecoration', 'text-rendering': 'textRendering',
  'underline-position': 'underlinePosition', 'underline-thickness': 'underlineThickness',
  'unicode-bidi': 'unicodeBidi', 'unicode-range': 'unicodeRange', 'units-per-em': 'unitsPerEm',
  'v-alphabetic': 'vAlphabetic', 'v-hanging': 'vHanging', 'v-ideographic': 'vIdeographic',
  'v-mathematical': 'vMathematical', 'vector-effect': 'vectorEffect', 'vert-adv-y': 'vertAdvY',
  'vert-origin-x': 'vertOriginX', 'vert-origin-y': 'vertOriginY', 'word-spacing': 'wordSpacing',
  'writing-mode': 'writingMode', 'x-height': 'xHeight',
};

const STRIP_ATTRS = new Set(['xmlns:xlink', 'xml:space']);

function styleStringToJSX(style: string): string {
  const pairs = style.split(';').map((s) => s.trim()).filter(Boolean);
  const entries = pairs.map((pair) => {
    const colon = pair.indexOf(':');
    if (colon < 0) return null;
    const prop = pair.slice(0, colon).trim();
    const val = pair.slice(colon + 1).trim();
    const camelProp = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const numericValue = parseFloat(val);
    const jsValue = !isNaN(numericValue) && String(numericValue) === val ? val : `'${val.replace(/'/g, "\\'")}'`;
    return `${camelProp}: ${jsValue}`;
  }).filter(Boolean);
  return `{{ ${entries.join(', ')} }}`;
}

function transformAttributes(attrs: string): string {
  if (!attrs.trim()) return '';
  const parts: string[] = [];
  const attrRe = /\s+([\w:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\{[^}]*\})|([^\s>]*)))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrs)) !== null) {
    const name = m[1];
    const value = m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    if (name === 'xmlns' || STRIP_ATTRS.has(name)) continue;
    const renamed = ATTR_RENAME[name] ?? SVG_HYPHENATED[name] ?? name;
    const finalName = renamed.startsWith('on') && renamed.length > 2 ? 'on' + renamed[2].toUpperCase() + renamed.slice(3) : renamed;
    if (name === 'style' && value && !value.startsWith('{')) parts.push(` ${finalName}=${styleStringToJSX(value)}`);
    else if (value === '' || m[2] === undefined && m[3] === undefined && m[4] === undefined && m[5] === undefined) parts.push(` ${finalName}`);
    else if (value.startsWith('{')) parts.push(` ${finalName}=${value}`);
    else parts.push(` ${finalName}="${value}"`);
  }
  return parts.join('');
}

interface ConvertOptions { language: 'tsx' | 'jsx'; componentName: string; spreadProps: boolean; removeComments: boolean; removeXmlns: boolean; }

function transformSVGToJSX(svg: string, opts: ConvertOptions): string {
  let result = svg;
  result = result.replace(/<\?xml[^>]*\?>\s*/g, '');
  if (opts.removeComments) result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<([a-zA-Z][a-zA-Z0-9:.-]*)([^>]*)(\/?>)/g, (match, tag, attrs, close) => `<${tag}${transformAttributes(attrs)}${close}`);
  const voidElements = ['circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect', 'use', 'image', 'stop'];
  for (const el of voidElements) result = result.replace(new RegExp(`(<${el}[^>]*)>(</${el}>)`, 'g'), '$1 />');
  result = result.replace(/>\s+</g, '>\n  <').trim();
  const typeAnnotation = opts.language === 'tsx' ? ': React.SVGProps<SVGSVGElement>' : '';
  const propsParam = opts.spreadProps ? `props${typeAnnotation}` : '';
  if (opts.spreadProps) result = result.replace(/^(<svg)/, `$1 {...props}`);
  return `import React from 'react';\n\nexport function ${opts.componentName}(${propsParam}) {\n  return (\n    ${result.replace(/\n/g, '\n    ')}\n  );\n}`;
}

const EXAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check">
  <polyline points="20 6 9 11 4 16"></polyline>
</svg>`;

const EXAMPLE_COMPLEX = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
  <!-- circle with gradient -->
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="40" fill="url(#grad1)" stroke-width="2" fill-opacity="0.8" />
  <text x="50" y="55" text-anchor="middle" font-size="14" font-family="Arial">Hello</text>
</svg>`;

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

const TRANSFORMATIONS: [string, string][] = [
  ['class', 'className'], ['for', 'htmlFor'], ['stroke-width', 'strokeWidth'],
  ['fill-opacity', 'fillOpacity'], ['clip-path', 'clipPath'], ['stop-color', 'stopColor'],
  ['font-size', 'fontSize'], ['text-anchor', 'textAnchor'], ['style="..."', 'style={{ ... }}'],
  ['xmlns / xmlns:xlink', '(removed)'], ['xlink:href', 'href'], ['onclick', 'onClick'],
];

export default function SVGToJSXPage() {
  const [input, setInput] = useState(EXAMPLE_SVG);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'tsx' | 'jsx'>('tsx');
  const [componentName, setComponentName] = useState('MyIcon');
  const [spreadProps, setSpreadProps] = useState(true);
  const [removeComments, setRemoveComments] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkViewport = () => setIsDesktop(window.innerWidth >= 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const convert = () => {
    if (!input.trim()) return;
    try {
      if (!input.trim().includes('<svg')) { setError('Input does not appear to contain an SVG element'); setOutput(''); return; }
      setOutput(transformSVGToJSX(input, { language, componentName: componentName || 'MyIcon', spreadProps, removeComments, removeXmlns: true }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed');
      setOutput('');
    }
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    height: 24, padding: '0 10px', border: '1px solid var(--bp-border)',
    background: active ? 'var(--bp-accent)' : 'transparent',
    color: active ? '#000' : 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 10, cursor: 'pointer',
  });

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
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='text'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2, letterSpacing: '0.01em' }}>SVG → JSX / TSX</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Convert raw SVG markup into a clean React component with properly transformed attributes</p>
      </div>

      {/* Options bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 14px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type='button' style={btnStyle(language === 'tsx')} onClick={() => setLanguage('tsx')}>TSX</button>
          <button type='button' style={btnStyle(language === 'jsx')} onClick={() => setLanguage('jsx')}>JSX</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Component</span>
          <input value={componentName} onChange={(e) => setComponentName(e.target.value)}
            style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '3px 8px', outline: 'none', width: 110 }}
            placeholder='MyIcon' />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--bp-ink-mute)', cursor: 'pointer' }}>
          <input type='checkbox' checked={spreadProps} onChange={(e) => setSpreadProps(e.target.checked)} style={{ accentColor: 'var(--bp-accent)' }} />
          Spread props
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--bp-ink-mute)', cursor: 'pointer' }}>
          <input type='checkbox' checked={removeComments} onChange={(e) => setRemoveComments(e.target.checked)} style={{ accentColor: 'var(--bp-accent)' }} />
          Remove comments
        </label>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)', alignSelf: 'center' }}>Examples:</span>
          <button type='button' style={btnStyle()} onClick={() => setInput(EXAMPLE_SVG)}>Simple icon</button>
          <button type='button' style={btnStyle()} onClick={() => setInput(EXAMPLE_COMPLEX)}>Gradient</button>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* Left: SVG Input */}
        <Panel title='SVG Input' style={{ borderRight: 0 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste SVG markup here…'
            spellCheck={false}
            style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0, color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button type='button' onClick={convert} disabled={!input.trim()}
              style={{ height: 28, padding: '0 14px', border: '1px solid var(--bp-accent)', background: 'rgba(240,198,116,0.1)', color: 'var(--bp-accent)', fontFamily: 'inherit', fontSize: 10, cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.4, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCode style={{ width: 12, height: 12 }} />
              CONVERT TO {language.toUpperCase()}
            </button>
          </div>
        </Panel>

        {/* Right: Output */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Panel title={`${language.toUpperCase()} Output`} style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '10px 14px', borderBottom: '1px solid rgba(248,113,113,0.2)' }}>
                  <AlertCircle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: '#fca5a5' }}>{error}</span>
                </div>
              )}
              <pre style={{ margin: 0, padding: '12px 14px', fontSize: 11, lineHeight: 1.65, color: output ? 'var(--bp-ink)' : 'var(--bp-ink-faint)', whiteSpace: 'pre', overflow: 'auto', minHeight: 200 }}>
                {output || 'Output will appear here…'}
              </pre>
            </div>
            {output && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
                <BpCopyBtn text={output} label='COPY' />
              </div>
            )}
          </Panel>

          {/* Transformations reference */}
          <Panel title='Attribute Transformations Applied' meta={`${TRANSFORMATIONS.length} rules`} style={{ flexShrink: 0, maxHeight: 180 }}>
            <div style={{ overflowY: 'auto', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {TRANSFORMATIONS.map(([from, to]) => (
                <div key={from} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                  <code style={{ color: '#f87171', width: 130, flexShrink: 0 }}>{from}</code>
                  <span style={{ color: 'var(--bp-ink-faint)' }}>→</span>
                  <code style={{ color: '#4ade80' }}>{to}</code>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
