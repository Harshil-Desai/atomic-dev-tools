'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { AlertCircle, ArrowUpDown } from 'lucide-react';

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

export default function Base64EncoderPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (value: string) => {
    setInput(value);
    setError(null);
    if (!value.trim()) { setOutput(''); return; }
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(value))));
      } else {
        try {
          setOutput(decodeURIComponent(escape(atob(value))));
        } catch {
          setOutput('');
        }
      }
    } catch {
      setOutput('');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setInput(output);
    setOutput(input);
    setError(null);
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='data'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div className='border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0 p-4 sm:p-5 md:p-6'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1 tracking-tight'>Base64 Encoder / Decoder</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Encode plaintext to Base64 or decode back</p>
      </div>

      {/* Main content */}
      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden'>
        <Panel title={mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode'} style={{ borderRight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={mode === 'encode' ? 'Enter text to encode to Base64...' : 'Enter Base64 string to decode...'}
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
              }}
            />
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 12px', flexShrink: 0 }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: '#fca5a5', margin: 0 }}>{error}</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0, flexWrap: 'wrap' }} className='p-2 sm:p-3'>
            <button className='bp-btn min-h-11 px-3 py-2' onClick={toggleMode} type='button'>
              <ArrowUpDown className='w-3.5 h-3.5 mr-1 inline' />SWITCH MODE
            </button>
          </div>
        </Panel>

        <Panel title={mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={output}
              readOnly
              placeholder={mode === 'encode' ? 'Base64 encoded output will appear here...' : 'Decoded text will appear here...'}
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
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0, flexWrap: 'wrap' }} className='p-2 sm:p-3'>
            <BpCopyBtn text={output} label='COPY' />
          </div>
        </Panel>
      </div>
    </div>
  );
}
