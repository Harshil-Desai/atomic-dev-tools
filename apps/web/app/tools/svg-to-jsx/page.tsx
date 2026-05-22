'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
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

export default function SVGToJSXPage() {
  const [input, setInput] = useState(EXAMPLE_SVG);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'tsx' | 'jsx'>('tsx');
  const [componentName, setComponentName] = useState('MyIcon');
  const [spreadProps, setSpreadProps] = useState(true);
  const [removeComments, setRemoveComments] = useState(false);

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

  return (
    <BpToolStage cat='text'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>SVG → JSX / TSX</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert raw SVG markup into a clean React component with properly transformed attributes</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-5xl mx-auto space-y-4'>

          <BpPanel title='Options'>
            <div className='flex flex-wrap gap-6 items-end mb-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output Language</label>
                <div className='flex gap-2'>
                  <button type='button' className={`bp-btn ${language === 'tsx' ? 'bp-btn-solid' : ''}`} onClick={() => setLanguage('tsx')}>TSX</button>
                  <button type='button' className={`bp-btn ${language === 'jsx' ? 'bp-btn-solid' : ''}`} onClick={() => setLanguage('jsx')}>JSX</button>
                </div>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Component Name</label>
                <input value={componentName} onChange={(e) => setComponentName(e.target.value)} className='bp-input w-36 font-mono' placeholder='MyIcon' />
              </div>
              <div className='flex gap-4'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={spreadProps} onChange={(e) => setSpreadProps(e.target.checked)} className='w-4 h-4 rounded' />
                  <span className='text-sm text-gray-300'>Spread props</span>
                </label>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={removeComments} onChange={(e) => setRemoveComments(e.target.checked)} className='w-4 h-4 rounded' />
                  <span className='text-sm text-gray-300'>Remove comments</span>
                </label>
              </div>
            </div>
            <div>
              <p className='text-xs text-gray-500 mb-2'>Examples</p>
              <div className='flex gap-2'>
                <button type='button' onClick={() => setInput(EXAMPLE_SVG)} className='bp-btn'>Simple icon</button>
                <button type='button' onClick={() => setInput(EXAMPLE_COMPLEX)} className='bp-btn'>Gradient + styles</button>
              </div>
            </div>
          </BpPanel>

          <div className='bp-layout-2col'>
            <BpPanel title='SVG Input'>
              <textarea className='bp-textarea font-mono text-xs' value={input} onChange={(e) => setInput(e.target.value)} placeholder='Paste SVG markup here…' rows={18} />
              <button type='button' className='bp-btn bp-btn-solid w-full mt-3' onClick={convert} disabled={!input.trim()}>
                <FileCode className='w-4 h-4 mr-2 inline' />CONVERT TO {language.toUpperCase()}
              </button>
            </BpPanel>

            <BpPanel title={`${language.toUpperCase()} Output`}>
              {output && (
                <div className='bp-panel-actions mb-3'>
                  <BpCopyBtn text={output} label='COPY' />
                </div>
              )}
              {error && (
                <div className='flex items-start gap-2 text-red-400 text-sm mb-3'>
                  <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
                  <span>{error}</span>
                </div>
              )}
              <pre className='bp-code-pre min-h-64 overflow-auto whitespace-pre text-xs'>
                {output || <span className='text-gray-600'>Output will appear here…</span>}
              </pre>
            </BpPanel>
          </div>

          <BpPanel title='Transformations Applied'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
              {[
                ['class', 'className'], ['for', 'htmlFor'], ['stroke-width', 'strokeWidth'],
                ['fill-opacity', 'fillOpacity'], ['clip-path', 'clipPath'], ['stop-color', 'stopColor'],
                ['font-size', 'fontSize'], ['text-anchor', 'textAnchor'], ['style="..."', 'style={{ ... }}'],
                ['xmlns / xmlns:xlink', '(removed)'], ['xlink:href', 'href'], ['onclick', 'onClick'],
              ].map(([from, to]) => (
                <div key={from} className='flex gap-2'>
                  <code className='text-red-400 font-mono w-36 shrink-0'>{from}</code>
                  <span className='text-gray-500'>→</span>
                  <code className='text-green-400 font-mono'>{to}</code>
                </div>
              ))}
            </div>
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
