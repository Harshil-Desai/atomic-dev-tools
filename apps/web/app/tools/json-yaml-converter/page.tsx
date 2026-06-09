'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { ArrowLeftRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import yaml from 'js-yaml';

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

export default function JsonYamlConverterPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [yamlInput, setYamlInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [yamlOutput, setYamlOutput] = useState('');
  const [jsonValid, setJsonValid] = useState<boolean | null>(null);
  const [yamlValid, setYamlValid] = useState<boolean | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [yamlIndent, setYamlIndent] = useState(2);
  const [jsonIndent, setJsonIndent] = useState(2);
  const [compactJson, setCompactJson] = useState(false);

  const validateJson = (text: string): boolean => {
    if (!text.trim()) { setJsonValid(null); setJsonError(null); return false; }
    try { JSON.parse(text); setJsonValid(true); setJsonError(null); return true; }
    catch (e) { setJsonValid(false); setJsonError(e instanceof Error ? e.message : 'Invalid JSON'); return false; }
  };

  const validateYaml = (text: string): boolean => {
    if (!text.trim()) { setYamlValid(null); setYamlError(null); return false; }
    try { yaml.load(text); setYamlValid(true); setYamlError(null); return true; }
    catch (e) { setYamlValid(false); setYamlError(e instanceof Error ? e.message : 'Invalid YAML'); return false; }
  };

  const jsonToYaml = () => {
    if (!validateJson(jsonInput)) return;
    try { setYamlOutput(yaml.dump(JSON.parse(jsonInput), { indent: yamlIndent })); setJsonOutput(''); }
    catch (e) { setYamlError(e instanceof Error ? e.message : 'Conversion failed'); }
  };

  const yamlToJson = () => {
    if (!validateYaml(yamlInput)) return;
    try { const parsed = yaml.load(yamlInput); setJsonOutput(compactJson ? JSON.stringify(parsed) : JSON.stringify(parsed, null, jsonIndent)); setYamlOutput(''); }
    catch (e) { setJsonError(e instanceof Error ? e.message : 'Conversion failed'); }
  };

  const swapContent = () => {
    const tempInput = jsonInput;
    const tempOutput = jsonOutput;
    setJsonInput(yamlInput); setJsonOutput(yamlOutput);
    setYamlInput(tempInput); setYamlOutput(tempOutput);
    const tempValid = jsonValid; const tempError = jsonError;
    setJsonValid(yamlValid); setJsonError(yamlError);
    setYamlValid(tempValid); setYamlError(tempError);
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--bp-bg)',
    border: '1px solid var(--bp-border-str)',
    color: 'var(--bp-ink)',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '4px 8px',
    outline: 'none',
    boxSizing: 'border-box',
    height: 28,
    cursor: 'pointer',
  };

  const textareaStyle: React.CSSProperties = {
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
  };

  return (
    <div
      data-cat='data'
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
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 2 }}>JSON ↔ YAML Converter</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Bidirectional lossless conversion between JSON and YAML</p>
      </div>

      {/* Settings bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>YAML Indent:</span>
          <select style={selectStyle} value={yamlIndent} onChange={(e) => setYamlIndent(parseInt(e.target.value))}>
            <option value='2'>2 spaces</option>
            <option value='4'>4 spaces</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>JSON Indent:</span>
          <select style={selectStyle} value={jsonIndent} onChange={(e) => setJsonIndent(parseInt(e.target.value))}>
            <option value='2'>2 spaces</option>
            <option value='4'>4 spaces</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--bp-ink-mute)', cursor: 'pointer' }}>
          <input type='checkbox' checked={compactJson} onChange={(e) => setCompactJson(e.target.checked)} style={{ width: 13, height: 13, cursor: 'pointer' }} />
          Compact JSON
        </label>
      </div>

      {/* Main 2-column input area */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* JSON Panel */}
        <Panel
          title='JSON'
          meta={jsonValid === true ? 'VALID' : jsonValid === false ? 'INVALID' : undefined}
          style={{ borderRight: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}
        >
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {jsonValid !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0, background: 'var(--bp-elevated)' }}>
                {jsonValid === true && (
                  <>
                    <CheckCircle style={{ width: 13, height: 13, color: '#4ad29a', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Valid JSON</span>
                  </>
                )}
                {jsonValid === false && (
                  <>
                    <XCircle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#f87171' }}>Invalid JSON</span>
                  </>
                )}
              </div>
            )}
            <textarea
              value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); validateJson(e.target.value); }}
              placeholder='Enter JSON here...'
              spellCheck={false}
              style={{ ...textareaStyle, flex: 1 }}
            />
            {jsonError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 12px', borderTop: '1px solid rgba(248,113,113,0.2)', background: 'rgba(153,27,27,0.15)', flexShrink: 0 }}>
                <AlertCircle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: '#f87171', lineHeight: 1.5 }}>{jsonError}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0, flexWrap: 'wrap' }}>
            <button className='bp-btn bp-btn-solid' onClick={jsonToYaml} disabled={!jsonValid || !jsonInput.trim()} type='button'>JSON → YAML</button>
          </div>
        </Panel>

        {/* YAML Panel */}
        <Panel
          title='YAML'
          meta={yamlValid === true ? 'VALID' : yamlValid === false ? 'INVALID' : undefined}
          style={{ borderTop: 0, borderLeft: '1px solid var(--bp-border)', borderRight: 0, borderBottom: 0 }}
        >
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {yamlValid !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0, background: 'var(--bp-elevated)' }}>
                {yamlValid === true && (
                  <>
                    <CheckCircle style={{ width: 13, height: 13, color: '#4ad29a', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Valid YAML</span>
                  </>
                )}
                {yamlValid === false && (
                  <>
                    <XCircle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#f87171' }}>Invalid YAML</span>
                  </>
                )}
              </div>
            )}
            <textarea
              value={yamlInput}
              onChange={(e) => { setYamlInput(e.target.value); validateYaml(e.target.value); }}
              placeholder='Enter YAML here...'
              spellCheck={false}
              style={{ ...textareaStyle, flex: 1 }}
            />
            {yamlError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 12px', borderTop: '1px solid rgba(248,113,113,0.2)', background: 'rgba(153,27,27,0.15)', flexShrink: 0 }}>
                <AlertCircle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: '#f87171', lineHeight: 1.5 }}>{yamlError}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0, flexWrap: 'wrap' }}>
            <button className='bp-btn' onClick={swapContent} type='button' title='Swap JSON and YAML'>
              <ArrowLeftRight style={{ width: 14, height: 14 }} />
            </button>
            <button className='bp-btn bp-btn-solid' onClick={yamlToJson} disabled={!yamlValid || !yamlInput.trim()} type='button'>YAML → JSON</button>
          </div>
        </Panel>
      </div>

      {/* Output Panel */}
      {(jsonOutput || yamlOutput) && (
        <Panel title='Output' meta={jsonOutput ? 'JSON' : 'YAML'} style={{ borderTop: '1px solid var(--bp-border)', borderLeft: 0, borderRight: 0, borderBottom: 0, flexShrink: 0, maxHeight: '35%' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <textarea
              value={jsonOutput || yamlOutput}
              readOnly
              spellCheck={false}
              style={{ ...textareaStyle, flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <BpCopyBtn text={jsonOutput || yamlOutput} label='COPY' />
          </div>
        </Panel>
      )}
    </div>
  );
}
