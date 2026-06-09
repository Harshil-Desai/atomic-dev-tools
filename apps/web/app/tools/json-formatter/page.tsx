'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileJson, AlertCircle, CheckCircle, Trash2, Minimize2 } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

type ValidationStatus = 'idle' | 'valid' | 'invalid';

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

export default function JsonFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentSize, setIndentSize] = useState<2 | 4>(2);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateJson = useCallback((text: string): { valid: boolean; error: string | null } => {
    if (!text.trim()) return { valid: false, error: null };
    try { JSON.parse(text); return { valid: true, error: null }; }
    catch (e) { return { valid: false, error: e instanceof Error ? e.message : 'Invalid JSON' }; }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) { setValidationStatus('idle'); setValidationError(null); return; }
    debounceRef.current = setTimeout(() => {
      const { valid, error } = validateJson(input);
      setValidationStatus(valid ? 'valid' : 'invalid');
      setValidationError(error);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, validateJson]);

  const handleFormat = () => {
    const { valid, error } = validateJson(input);
    if (!valid) { setValidationStatus('invalid'); setValidationError(error); setOutput(''); return; }
    try { setOutput(JSON.stringify(JSON.parse(input), null, indentSize)); setValidationStatus('valid'); setValidationError(null); } catch { setOutput(''); }
  };

  const handleMinify = () => {
    const { valid, error } = validateJson(input);
    if (!valid) { setValidationStatus('invalid'); setValidationError(error); setOutput(''); return; }
    try { setOutput(JSON.stringify(JSON.parse(input))); setValidationStatus('valid'); setValidationError(null); } catch { setOutput(''); }
  };

  const handleValidateOnly = () => {
    const { valid, error } = validateJson(input);
    setValidationStatus(valid ? 'valid' : 'invalid');
    setValidationError(error);
    setOutput('');
  };

  const handleClear = () => { setInput(''); setOutput(''); setValidationStatus('idle'); setValidationError(null); };

  const charCount = input.length;
  const lineCount = input ? input.split('\n').length : 0;
  const errorLineMatch = validationError?.match(/line (\d+)/i);
  const errorLine = errorLineMatch ? errorLineMatch[1] : null;

  return (
    <div
      className='h-full flex flex-col overflow-hidden relative'
      data-cat='data'
      style={{ ...CSS_VARS, background: 'var(--bp-bg)', color: 'var(--bp-ink)', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <FileJson style={{ width: 16, height: 16, color: 'var(--bp-accent)', flexShrink: 0 }} />
          <h1 style={{ fontSize: 13, fontWeight: 600, color: 'var(--bp-ink)', margin: 0, letterSpacing: '0.01em' }}>JSON Formatter</h1>
        </div>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Validate, format and minify JSON documents</p>
      </div>

      {/* Actions bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-elevated)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Indent:</span>
          <select
            value={indentSize}
            onChange={(e) => setIndentSize(parseInt(e.target.value) as 2 | 4)}
            style={{
              background: 'var(--bp-bg)',
              border: '1px solid var(--bp-border-str)',
              color: 'var(--bp-ink)',
              fontFamily: 'inherit',
              fontSize: 11,
              padding: '3px 8px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>

        {validationStatus === 'valid' && (
          <span className='bp-status-ok' style={{ fontSize: 10 }}>VALID JSON</span>
        )}
        {validationStatus === 'invalid' && (
          <span className='bp-status-fail' style={{ fontSize: 10 }}>INVALID{errorLine ? ` (line ${errorLine})` : ''}</span>
        )}

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button className='bp-btn' onClick={handleClear} type='button'>
            <Trash2 style={{ width: 12, height: 12, marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />CLEAR
          </button>
          <button className='bp-btn' onClick={handleValidateOnly} disabled={!input.trim()} type='button'>
            <CheckCircle style={{ width: 12, height: 12, marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />VALIDATE
          </button>
          <button className='bp-btn' onClick={handleMinify} disabled={!input.trim()} type='button'>
            <Minimize2 style={{ width: 12, height: 12, marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />MINIFY
          </button>
          <button className='bp-btn bp-btn-solid' onClick={handleFormat} disabled={!input.trim()} type='button'>
            <FileJson style={{ width: 12, height: 12, marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />FORMAT
          </button>
        </div>
      </div>

      {/* Main content: 2-column layout */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Input panel */}
        <Panel
          title='JSON Input'
          meta={`${charCount.toLocaleString()} chars · ${lineCount.toLocaleString()} lines`}
          style={{ borderRight: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}
        >
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Paste your JSON here...'
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
                minHeight: 300,
              }}
            />
          </div>
          {validationStatus === 'invalid' && validationError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderTop: '1px solid rgba(239,68,68,0.3)', background: 'rgba(127,29,29,0.15)', flexShrink: 0 }}>
              <AlertCircle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1, color: '#f87171' }} />
              <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'inherit' }}>{validationError}</span>
            </div>
          )}
        </Panel>

        {/* Output panel */}
        <Panel
          title='Output'
          meta={output ? `${output.length.toLocaleString()} chars · ${output.split('\n').length.toLocaleString()} lines` : undefined}
          style={{ borderTop: 0, borderBottom: 0, borderRight: 0 }}
        >
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {output ? (
              <textarea
                value={output}
                readOnly
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
                  minHeight: 300,
                }}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--bp-ink-faint)', gap: 10 }}>
                <FileJson style={{ width: 32, height: 32, opacity: 0.3 }} />
                <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>
                  {input.trim() ? 'Click Format, Minify, or Validate' : 'Paste JSON in the left panel'}
                </span>
              </div>
            )}
          </div>
          {output && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
              <BpCopyBtn text={output} label='COPY' />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
