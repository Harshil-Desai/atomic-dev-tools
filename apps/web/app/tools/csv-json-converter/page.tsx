'use client';

import React, { useState } from 'react';
import { ArrowLeftRight, AlertCircle, Table } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

type Direction = 'csv-to-json' | 'json-to-csv';
type Delimiter = ',' | ';' | '\t';

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

function parseCSV(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) { cells.push(current); current = ''; }
      else current += ch;
    }
    cells.push(current);
    rows.push(cells);
  }
  return rows;
}

function csvToJson(text: string, delimiter: Delimiter) {
  try {
    const rows = parseCSV(text.trim(), delimiter);
    if (rows.length < 1) return { result: '', error: 'No data found', rowCount: 0, colCount: 0 };
    const [headers, ...dataRows] = rows;
    const objects = dataRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => { obj[header.trim()] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
    return { result: JSON.stringify(objects, null, 2), error: null, rowCount: dataRows.length, colCount: headers.length };
  } catch (e) { return { result: '', error: e instanceof Error ? e.message : 'Parse error', rowCount: 0, colCount: 0 }; }
}

function jsonToCsv(text: string, delimiter: Delimiter, includeHeaders: boolean) {
  try {
    const parsed = JSON.parse(text.trim());
    if (!Array.isArray(parsed)) return { result: '', error: 'Input must be a JSON array of objects', rowCount: 0, colCount: 0 };
    if (parsed.length === 0) return { result: '', error: 'Array is empty', rowCount: 0, colCount: 0 };
    const allKeys = Array.from(new Set(parsed.flatMap((obj) => (typeof obj === 'object' && obj !== null ? Object.keys(obj) : []))));
    const escapeCell = (value: unknown): string => {
      const str = value === null || value === undefined ? '' : String(value);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const lines: string[] = [];
    if (includeHeaders) lines.push(allKeys.map(escapeCell).join(delimiter));
    for (const row of parsed) {
      lines.push(allKeys.map((key) => escapeCell(typeof row === 'object' && row !== null ? (row as Record<string, unknown>)[key] : '')).join(delimiter));
    }
    return { result: lines.join('\n'), error: null, rowCount: parsed.length, colCount: allKeys.length };
  } catch (e) { return { result: '', error: e instanceof Error ? e.message : 'Parse error', rowCount: 0, colCount: 0 }; }
}

const DELIMITER_LABELS: Record<Delimiter, string> = { ',': 'Comma (,)', ';': 'Semicolon (;)', '\t': 'Tab (\\t)' };

export default function CsvJsonConverterPage() {
  const [direction, setDirection] = useState<Direction>('csv-to-json');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [summary, setSummary] = useState<{ rowCount: number; colCount: number } | null>(null);

  const handleConvert = () => {
    setError(null); setOutput(''); setSummary(null);
    if (!input.trim()) return;
    const { result, error: err, rowCount, colCount } = direction === 'csv-to-json'
      ? csvToJson(input, delimiter)
      : jsonToCsv(input, delimiter, includeHeaders);
    setOutput(result); setError(err);
    if (!err) setSummary({ rowCount, colCount });
  };

  const handleInputChange = (value: string) => { setInput(value); setError(null); setOutput(''); setSummary(null); };

  const switchDirection = () => {
    const next: Direction = direction === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json';
    setDirection(next); setInput(output); setOutput(''); setError(null); setSummary(null);
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <Table style={{ width: 16, height: 16, color: 'var(--bp-accent)', flexShrink: 0 }} />
          <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--bp-ink)', margin: 0, letterSpacing: '0.01em' }}>CSV ↔ JSON Converter</h1>
        </div>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Convert CSV spreadsheets to JSON arrays and back</p>
      </div>

      {/* Options bar */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', flexWrap: 'wrap' }}>
          {/* Direction toggle */}
          <div style={{ display: 'flex', overflow: 'hidden', border: '1px solid var(--bp-border-str)' }}>
            {(['csv-to-json', 'json-to-csv'] as Direction[]).map((d) => (
              <button
                key={d}
                type='button'
                onClick={() => { setDirection(d); setInput(''); setOutput(''); setError(null); setSummary(null); }}
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  border: 0,
                  background: direction === d ? 'var(--bp-accent)' : 'var(--bp-elevated)',
                  color: direction === d ? '#0a0e14' : 'var(--bp-ink-mute)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {d === 'csv-to-json' ? 'CSV → JSON' : 'JSON → CSV'}
              </button>
            ))}
          </div>

          <button className='bp-btn' onClick={switchDirection} type='button'>
            <ArrowLeftRight className='w-3.5 h-3.5 mr-1 inline' />SWAP
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Delimiter:</span>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as Delimiter)}
              style={{
                background: 'var(--bp-bg)',
                border: '1px solid var(--bp-border-str)',
                color: 'var(--bp-ink)',
                fontFamily: 'inherit',
                fontSize: 11,
                padding: '3px 8px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {(Object.entries(DELIMITER_LABELS) as [Delimiter, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {direction === 'json-to-csv' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--bp-ink-mute)', cursor: 'pointer' }}>
              <input
                type='checkbox'
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
                style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--bp-accent)' }}
              />
              Include headers
            </label>
          )}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Input panel */}
        <Panel title={direction === 'csv-to-json' ? 'CSV Input' : 'JSON Input'} style={{ borderRight: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={direction === 'csv-to-json' ? 'name,age,city\nAlice,30,New York\nBob,25,"Los Angeles, CA"' : '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'}
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
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderTop: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', flexShrink: 0 }}>
              <AlertCircle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'inherit' }}>{error}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button
              className='bp-btn bp-btn-solid'
              onClick={handleConvert}
              disabled={!input.trim()}
              type='button'
            >
              {direction === 'csv-to-json' ? 'CONVERT TO JSON' : 'CONVERT TO CSV'}
            </button>
          </div>
        </Panel>

        {/* Output panel */}
        <Panel
          title={direction === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
          meta={summary ? `${summary.rowCount} rows · ${summary.colCount} cols` : undefined}
          style={{ borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: '1px solid var(--bp-border)' }}
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
                  minHeight: 200,
                }}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--bp-ink-faint)' }}>
                <Table style={{ width: 32, height: 32, opacity: 0.3, marginBottom: 10 }} />
                <p style={{ fontSize: 11, margin: '0 0 4px', color: 'var(--bp-ink-mute)' }}>Output will appear here</p>
                <p style={{ fontSize: 10, margin: 0, color: 'var(--bp-ink-faint)' }}>CSV headers are taken from the first row</p>
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
