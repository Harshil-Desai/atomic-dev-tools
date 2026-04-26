'use client';

import { useState } from 'react';
import { ArrowLeftRight, Copy, Check, AlertCircle, Table } from 'lucide-react';
import { Button, Card, CardContent, Textarea } from '@/ui';

type Direction = 'csv-to-json' | 'json-to-csv';
type Delimiter = ',' | ';' | '\t';

function parseCSV(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    rows.push(cells);
  }
  return rows;
}

function csvToJson(text: string, delimiter: Delimiter): { result: string; error: string | null; rowCount: number; colCount: number } {
  try {
    const rows = parseCSV(text.trim(), delimiter);
    if (rows.length < 1) return { result: '', error: 'No data found', rowCount: 0, colCount: 0 };
    const [headers, ...dataRows] = rows;
    const objects = dataRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header.trim()] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });
    return {
      result: JSON.stringify(objects, null, 2),
      error: null,
      rowCount: dataRows.length,
      colCount: headers.length,
    };
  } catch (e) {
    return { result: '', error: e instanceof Error ? e.message : 'Parse error', rowCount: 0, colCount: 0 };
  }
}

function jsonToCsv(
  text: string,
  delimiter: Delimiter,
  includeHeaders: boolean,
): { result: string; error: string | null; rowCount: number; colCount: number } {
  try {
    const parsed = JSON.parse(text.trim());
    if (!Array.isArray(parsed)) return { result: '', error: 'Input must be a JSON array of objects', rowCount: 0, colCount: 0 };
    if (parsed.length === 0) return { result: '', error: 'Array is empty', rowCount: 0, colCount: 0 };

    const allKeys = Array.from(new Set(parsed.flatMap((obj) => (typeof obj === 'object' && obj !== null ? Object.keys(obj) : []))));

    const escapeCell = (value: unknown): string => {
      const str = value === null || value === undefined ? '' : String(value);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];
    if (includeHeaders) {
      lines.push(allKeys.map(escapeCell).join(delimiter));
    }
    for (const row of parsed) {
      const cells = allKeys.map((key) => escapeCell(typeof row === 'object' && row !== null ? (row as Record<string, unknown>)[key] : ''));
      lines.push(cells.join(delimiter));
    }

    return {
      result: lines.join('\n'),
      error: null,
      rowCount: parsed.length,
      colCount: allKeys.length,
    };
  } catch (e) {
    return { result: '', error: e instanceof Error ? e.message : 'Parse error', rowCount: 0, colCount: 0 };
  }
}

const DELIMITER_LABELS: Record<Delimiter, string> = {
  ',': 'Comma (,)',
  ';': 'Semicolon (;)',
  '\t': 'Tab (\\t)',
};

export default function CsvJsonConverterPage() {
  const [direction, setDirection] = useState<Direction>('csv-to-json');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<{ rowCount: number; colCount: number } | null>(null);

  const handleConvert = () => {
    setError(null);
    setOutput('');
    setSummary(null);
    if (!input.trim()) return;

    if (direction === 'csv-to-json') {
      const { result, error: err, rowCount, colCount } = csvToJson(input, delimiter);
      setOutput(result);
      setError(err);
      if (!err) setSummary({ rowCount, colCount });
    } else {
      const { result, error: err, rowCount, colCount } = jsonToCsv(input, delimiter, includeHeaders);
      setOutput(result);
      setError(err);
      if (!err) setSummary({ rowCount, colCount });
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setError(null);
    setOutput('');
    setSummary(null);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const switchDirection = () => {
    const next: Direction = direction === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json';
    setDirection(next);
    setInput(output);
    setOutput('');
    setError(null);
    setSummary(null);
    setCopied(false);
  };

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-3 mb-1'>
          <Table className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>CSV ↔ JSON Converter</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground'>Convert between CSV and JSON array formats</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Direction + Settings */}
          <Card>
            <CardContent className='pt-5'>
              <div className='flex flex-wrap items-center gap-3'>
                {/* Direction toggle */}
                <div className='flex rounded-md overflow-hidden border border-[hsla(0,0%,20%,1)]'>
                  <button
                    onClick={() => { setDirection('csv-to-json'); setInput(''); setOutput(''); setError(null); setSummary(null); }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      direction === 'csv-to-json'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    CSV → JSON
                  </button>
                  <button
                    onClick={() => { setDirection('json-to-csv'); setInput(''); setOutput(''); setError(null); setSummary(null); }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      direction === 'json-to-csv'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    JSON → CSV
                  </button>
                </div>

                <Button onClick={switchDirection} variant='outline' size='sm'>
                  <ArrowLeftRight className='w-3.5 h-3.5 mr-1.5' />
                  Swap & Switch
                </Button>

                <div className='flex items-center gap-2 ml-auto'>
                  <label className='text-xs text-gray-400'>Delimiter:</label>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value as Delimiter)}
                    className='h-8 px-2 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    {(Object.entries(DELIMITER_LABELS) as [Delimiter, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {direction === 'json-to-csv' && (
                  <label className='flex items-center gap-2 text-xs text-gray-300 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                      className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500'
                    />
                    Include headers
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Input */}
          <Card>
            <CardContent className='pt-5 space-y-3'>
              <label className='text-sm font-medium text-gray-300'>
                {direction === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
              </label>
              <Textarea
                placeholder={
                  direction === 'csv-to-json'
                    ? 'name,age,city\nAlice,30,New York\nBob,25,"Los Angeles, CA"'
                    : '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'
                }
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                rows={12}
                className='font-mono text-sm'
              />
              {error && (
                <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900 p-2.5 rounded-md'>
                  <AlertCircle className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' />
                  <span className='font-mono'>{error}</span>
                </div>
              )}
              <div className='flex justify-end'>
                <Button onClick={handleConvert} disabled={!input.trim()}>
                  {direction === 'csv-to-json' ? 'Convert to JSON' : 'Convert to CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Output */}
          {output && (
            <Card>
              <CardContent className='pt-5 space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <label className='text-sm font-medium text-gray-300'>
                      {direction === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
                    </label>
                    {summary && (
                      <span className='text-xs text-gray-500'>
                        {summary.rowCount} row{summary.rowCount !== 1 ? 's' : ''} · {summary.colCount} column{summary.colCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <Button onClick={handleCopy} variant='outline' size='sm'>
                    {copied ? (
                      <>
                        <Check className='w-3.5 h-3.5 mr-1.5' />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className='w-3.5 h-3.5 mr-1.5' />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={output}
                  readOnly
                  rows={12}
                  className='font-mono text-sm bg-gray-950'
                />
              </CardContent>
            </Card>
          )}

          {!output && !error && !input.trim() && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-10'>
                  <Table className='w-10 h-10 mx-auto mb-3 opacity-40' />
                  <p className='text-sm'>Paste your data above and click Convert</p>
                  <p className='text-xs mt-1 text-gray-600'>CSV headers are taken from the first row</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
