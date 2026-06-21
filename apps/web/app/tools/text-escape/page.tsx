'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { AlertCircle, Type } from 'lucide-react';

type EscapeType = 'url' | 'html' | 'javascript' | 'json' | 'base64' | 'unicode';

const HTML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };
const HTML_ENTITIES_REVERSE: Record<string, string> = Object.fromEntries(Object.entries(HTML_ENTITIES).map(([k, v]) => [v, k]));

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

export default function TextEscapePage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [escapeType, setEscapeType] = useState<EscapeType>('url');
  const [error, setError] = useState<string | null>(null);

  const ops: Record<EscapeType, { escape: (t: string) => string; unescape: (t: string) => string }> = {
    url: { escape: encodeURIComponent, unescape: (t) => { try { return decodeURIComponent(t); } catch { throw new Error('Invalid URL encoding'); } } },
    html: {
      escape: (t) => t.split('').map((c) => HTML_ENTITIES[c] || c).join(''),
      unescape: (t) => { let r = t; Object.entries(HTML_ENTITIES_REVERSE).forEach(([e, c]) => { r = r.replace(new RegExp(e, 'g'), c); }); r = r.replace(/&#x([0-9A-Fa-f]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16))); r = r.replace(/&#([0-9]+);/g, (_, c) => String.fromCharCode(parseInt(c, 10))); return r; },
    },
    javascript: {
      escape: (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'),
      unescape: (t) => t.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
    },
    json: {
      escape: (t) => JSON.stringify(t),
      unescape: (t) => { try { return JSON.parse(t); } catch { throw new Error('Invalid JSON string'); } },
    },
    base64: {
      escape: (t) => { try { return btoa(unescape(encodeURIComponent(t))); } catch { throw new Error('Failed to encode to Base64'); } },
      unescape: (t) => { try { return decodeURIComponent(escape(atob(t))); } catch { throw new Error('Invalid Base64 string'); } },
    },
    unicode: {
      escape: (t) => t.split('').map((c) => c.charCodeAt(0) > 127 ? '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0') : c).join(''),
      unescape: (t) => t.replace(/\\u([0-9A-Fa-f]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16))),
    },
  };

  const run = (fn: (t: string) => string) => {
    setError(null);
    try {
      const result = fn(input);
      setOutput(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setOutput('');
    }
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
      {/* Compact header */}
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1' style={{ letterSpacing: '0.02em' }}>Text Escape</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Escape and unescape HTML, URL, JavaScript and more</p>
      </div>

      {/* Config bar */}
      <div className='p-2 sm:p-3 flex flex-wrap items-center gap-2 sm:gap-3' style={{ borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-elevated)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', fontWeight: 600 }}>Type</span>
          <select
            value={escapeType}
            onChange={(e) => setEscapeType(e.target.value as EscapeType)}
            style={{
              background: 'var(--bp-bg)',
              border: '1px solid var(--bp-border-str)',
              color: 'var(--bp-ink)',
              fontFamily: 'inherit',
              fontSize: 11,
              padding: '5px 8px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value='url'>URL Encoding</option>
            <option value='html'>HTML Entities</option>
            <option value='javascript'>JavaScript Strings</option>
            <option value='json'>JSON Strings</option>
            <option value='base64'>Base64</option>
            <option value='unicode'>Unicode Escape</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          <button className='bp-btn bp-btn-solid min-h-10 px-3 py-2' onClick={() => run(ops[escapeType].escape)} disabled={!input.trim()} type='button'>ESCAPE</button>
          <button className='bp-btn min-h-10 px-3 py-2' onClick={() => run(ops[escapeType].unescape)} disabled={!input.trim()} type='button'>UNESCAPE</button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className='grid grid-cols-1 lg:grid-cols-2' style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Panel title='Input Text' meta={`${input.length} chars`} style={{ borderRight: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Enter text to escape or unescape...'
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                background: 'var(--bp-bg)',
                border: 0,
                color: 'var(--bp-ink)',
                fontFamily: 'inherit',
                fontSize: 12,
                padding: '12px 14px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.65,
                minHeight: 200,
              }}
            />
          </div>
        </Panel>

        <Panel title='Output Text' meta={`${output.length} chars`} style={{ borderTop: 0, borderLeft: '1px solid var(--bp-border)', borderRight: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={output}
              readOnly
              placeholder='Result will appear here...'
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                background: 'var(--bp-bg)',
                border: 0,
                color: 'var(--bp-ink)',
                fontFamily: 'inherit',
                fontSize: 12,
                padding: '12px 14px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.65,
                minHeight: 200,
              }}
            />
          </div>
          <div className='p-2 sm:p-3 flex flex-wrap items-center gap-2 sm:gap-3' style={{ borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <BpCopyBtn text={output} label='COPY' />
          </div>
        </Panel>
      </div>

      {/* Error / empty state */}
      {error && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderTop: '1px solid rgba(239,68,68,0.3)', background: 'rgba(127,29,29,0.15)' }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      {!input.trim() && !error && (
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
          <Type style={{ width: 32, height: 32, color: 'var(--bp-ink-faint)', opacity: 0.5 }} />
          <span style={{ fontSize: 11, color: 'var(--bp-ink-faint)' }}>Enter text and choose an operation to get started</span>
        </div>
      )}
    </div>
  );
}
