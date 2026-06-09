'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Code2, AlertCircle, Minimize2, Sparkles } from 'lucide-react';

type Language = 'json' | 'javascript' | 'css' | 'html';
type Action = 'minify' | 'beautify';

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

export default function CodeFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState<Language>('json');
  const [error, setError] = useState<string | null>(null);
  const [indentSize, setIndentSize] = useState(2);
  const [inputStats, setInputStats] = useState({ lines: 0, chars: 0 });
  const [outputStats, setOutputStats] = useState({ lines: 0, chars: 0 });
  const [reduction, setReduction] = useState<number | null>(null);

  const beautifyJson = (code: string, indent: number): string => {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, indent === 0 ? 0 : indent);
    } catch (e) {
      throw new Error('Invalid JSON syntax');
    }
  };

  const minifyJson = (code: string): string => {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed);
    } catch (e) {
      throw new Error('Invalid JSON syntax');
    }
  };

  const beautifyJavaScript = (code: string, indent: number): string => {
    let result = code;
    const indentStr = indent === 0 ? '' : ' '.repeat(indent);
    result = result.replace(/;/g, ';\n');
    result = result.replace(/\{/g, '\n{\n');
    result = result.replace(/\}/g, '\n}\n');
    const lines = result.split('\n');
    let indentLevel = 0;
    const indented = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';
      if (trimmed === '}' || trimmed === '});') indentLevel = Math.max(0, indentLevel - 1);
      const indentedLine = indentStr.repeat(indentLevel) + trimmed;
      if (trimmed === '{' || trimmed.includes('{')) indentLevel++;
      return indentedLine;
    });
    return indented.join('\n');
  };

  const minifyJavaScript = (code: string): string => {
    let result = code;
    result = result.replace(/\/\/.*$/gm, '');
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s*([=+\-*/<>{}();,.])\s*/g, '$1');
    return result.trim();
  };

  const beautifyCss = (code: string, indent: number): string => {
    let result = code;
    const indentStr = ' '.repeat(indent);
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/;/g, ';\n');
    result = result.replace(/\}/g, '}\n\n');
    const lines = result.split('\n');
    let indentLevel = 0;
    const indented = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';
      if (trimmed.startsWith('}')) indentLevel = Math.max(0, indentLevel - 1);
      const indentedLine = indentStr.repeat(indentLevel) + trimmed;
      if (trimmed.startsWith('{')) indentLevel++;
      return indentedLine;
    });
    return indented.join('\n').trim();
  };

  const minifyCss = (code: string): string => {
    let result = code;
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s*([{}:;,])\s*/g, '$1');
    result = result.replace(/;\}/g, '}');
    return result.trim();
  };

  const beautifyHtml = (code: string, indent: number): string => {
    let result = code;
    const indentStr = ' '.repeat(indent);
    result = result.replace(/>\s+</g, '><');
    result = result.replace(/(<\/\w+>)/g, '$1\n');
    const lines = result.split('\n');
    let indentLevel = 0;
    const indented = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';
      if (trimmed.startsWith('</')) indentLevel = Math.max(0, indentLevel - 1);
      const indentedLine = indentStr.repeat(indentLevel) + trimmed;
      if (trimmed.match(/<[^/]/)) indentLevel++;
      return indentedLine;
    });
    return indented.join('\n').trim();
  };

  const minifyHtml = (code: string): string => {
    let result = code;
    result = result.replace(/<!--[\s\S]*?-->/g, '');
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/>\s+</g, '><');
    return result.trim();
  };

  const handleProcess = (action: Action) => {
    setError(null);
    try {
      let result = '';
      const indent = action === 'beautify' ? indentSize : 0;
      if (language === 'json') {
        result = action === 'beautify' ? beautifyJson(input, indent) : minifyJson(input);
      } else if (language === 'javascript') {
        result = action === 'beautify' ? beautifyJavaScript(input, indent) : minifyJavaScript(input);
      } else if (language === 'css') {
        result = action === 'beautify' ? beautifyCss(input, indent) : minifyCss(input);
      } else if (language === 'html') {
        result = action === 'beautify' ? beautifyHtml(input, indent) : minifyHtml(input);
      }
      setOutput(result);
      setInputStats({ lines: input.split('\n').length, chars: input.length });
      setOutputStats({ lines: result.split('\n').length, chars: result.length });
      const reductionPercent = action === 'minify' && input.length > 0
        ? Math.round(((input.length - result.length) / input.length) * 100)
        : null;
      setReduction(reductionPercent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setOutput('');
      setOutputStats({ lines: 0, chars: 0 });
      setReduction(null);
    }
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--bp-bg)',
    border: '1px solid var(--bp-border-str)',
    color: 'var(--bp-ink)',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '7px 10px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  };

  return (
    <div
      data-cat='text'
      style={{
        ...CSS_VARS,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bp-bg)',
        color: 'var(--bp-ink)',
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>Code Formatter</h1>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--bp-ink-mute)' }}>Beautify and minify JSON, JavaScript, CSS and HTML</p>
      </div>

      {/* Config bar */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '10px 16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
            <label style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', fontWeight: 600 }}>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              style={selectStyle}
            >
              <option value='json'>JSON</option>
              <option value='javascript'>JavaScript</option>
              <option value='css'>CSS</option>
              <option value='html'>HTML</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
            <label style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', fontWeight: 600 }}>Indentation Size</label>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(parseInt(e.target.value))}
              style={selectStyle}
            >
              <option value='0'>0 (none)</option>
              <option value='2'>2 spaces</option>
              <option value='4'>4 spaces</option>
              <option value='8'>8 spaces</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              className='bp-btn bp-btn-solid'
              onClick={() => handleProcess('beautify')}
              disabled={!input.trim()}
              type='button'
            >
              <Sparkles className='w-4 h-4 mr-2 inline' />BEAUTIFY
            </button>
            <button
              className='bp-btn'
              onClick={() => handleProcess('minify')}
              disabled={!input.trim()}
              type='button'
            >
              <Minimize2 className='w-4 h-4 mr-2 inline' />MINIFY
            </button>
          </div>
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 16px', borderBottom: '1px solid rgba(239,68,68,0.3)', background: 'rgba(127,29,29,0.15)' }}>
          <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      {/* Main 2-col layout */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        <Panel
          title='Input Code'
          meta={inputStats.chars > 0 ? `${inputStats.lines} lines · ${inputStats.chars} chars` : undefined}
          style={{ borderRight: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}
        >
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Enter ${language.toUpperCase()} code here...`}
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                background: 'var(--bp-bg)',
                border: 0,
                color: 'var(--bp-ink)',
                fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                fontSize: 12,
                padding: '12px 14px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.65,
                minHeight: 300,
              }}
            />
          </div>
        </Panel>

        <Panel
          title='Output Code'
          meta={outputStats.chars > 0 ? `${outputStats.lines} lines · ${outputStats.chars} chars${reduction !== null && reduction > 0 ? ` · ${reduction}% smaller` : ''}` : undefined}
          style={{ borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: '1px solid var(--bp-border)' }}
        >
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={output}
              readOnly
              placeholder='Formatted code will appear here...'
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                background: 'var(--bp-bg)',
                border: 0,
                color: 'var(--bp-ink)',
                fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                fontSize: 12,
                padding: '12px 14px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.65,
                minHeight: 300,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0, flexWrap: 'wrap' }}>
            <BpCopyBtn text={output} label='COPY' />
          </div>
        </Panel>
      </div>

      {/* Empty state */}
      {!input.trim() && !error && (
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <Code2 style={{ width: 32, height: 32, color: 'var(--bp-ink-faint)', opacity: 0.5 }} />
          <span style={{ fontSize: 11, color: 'var(--bp-ink-faint)' }}>Enter code and choose an operation to get started</span>
        </div>
      )}
    </div>
  );
}
