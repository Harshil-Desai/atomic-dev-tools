'use client';

import { useState } from 'react';
import { ArrowLeftRight, AlertCircle, Table } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

type Direction = 'csv-to-json' | 'json-to-csv';
type Delimiter = ',' | ';' | '\t';

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
    <BpToolStage cat='data'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-3 mb-1'>
          <Table className='w-5 h-5 text-gray-400' />
          <h1 className='text-xl sm:text-2xl font-semibold text-white'>CSV ↔ JSON Converter</h1>
        </div>
        <p className='text-xs sm:text-sm text-gray-400'>Convert between CSV and JSON array formats</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          <BpPanel title='Options'>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex rounded-md overflow-hidden border border-[hsla(0,0%,20%,1)]'>
                {(['csv-to-json', 'json-to-csv'] as Direction[]).map((d) => (
                  <button key={d} onClick={() => { setDirection(d); setInput(''); setOutput(''); setError(null); setSummary(null); }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${direction === d ? 'bg-blue-600 text-white' : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'}`}>
                    {d === 'csv-to-json' ? 'CSV → JSON' : 'JSON → CSV'}
                  </button>
                ))}
              </div>
              <button className='bp-btn' onClick={switchDirection} type='button'>
                <ArrowLeftRight className='w-3.5 h-3.5 mr-1 inline' />SWAP
              </button>
              <div className='flex items-center gap-2 ml-auto'>
                <label className='text-xs text-gray-500'>Delimiter:</label>
                <select className='bp-input h-8 px-2 text-xs' value={delimiter} onChange={(e) => setDelimiter(e.target.value as Delimiter)}>
                  {(Object.entries(DELIMITER_LABELS) as [Delimiter, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              {direction === 'json-to-csv' && (
                <label className='flex items-center gap-2 text-xs text-gray-400 cursor-pointer'>
                  <input type='checkbox' checked={includeHeaders} onChange={(e) => setIncludeHeaders(e.target.checked)} className='w-3.5 h-3.5' />
                  Include headers
                </label>
              )}
            </div>
          </BpPanel>

          <BpPanel title={direction === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}>
            <textarea
              className='bp-textarea font-mono text-sm mb-3'
              placeholder={direction === 'csv-to-json' ? 'name,age,city\nAlice,30,New York\nBob,25,"Los Angeles, CA"' : '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              rows={12}
            />
            {error && (
              <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900 p-2.5 rounded-md mb-3'>
                <AlertCircle className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' /><span className='font-mono'>{error}</span>
              </div>
            )}
            <div className='flex justify-end'>
              <button className='bp-btn bp-btn-solid' onClick={handleConvert} disabled={!input.trim()} type='button'>
                {direction === 'csv-to-json' ? 'CONVERT TO JSON' : 'CONVERT TO CSV'}
              </button>
            </div>
          </BpPanel>

          {output && (
            <BpPanel title={direction === 'csv-to-json' ? 'JSON Output' : 'CSV Output'} meta={summary ? `${summary.rowCount} rows · ${summary.colCount} cols` : undefined}>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={output} label='COPY' />
              </div>
              <textarea className='bp-textarea font-mono text-sm' value={output} readOnly rows={12} />
            </BpPanel>
          )}

          {!output && !error && !input.trim() && (
            <div className='text-center text-gray-600 py-12'>
              <Table className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Paste your data above and click Convert</p>
              <p className='text-xs mt-1'>CSV headers are taken from the first row</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
