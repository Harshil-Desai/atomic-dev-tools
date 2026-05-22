'use client';

import { useState } from 'react';
import { Terminal, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

type Direction = 'curl-to-fetch' | 'fetch-to-curl';
type OutputTab = 'fetch' | 'axios';

function tokeniseShell(cmd: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = cmd.length;
  while (i < len) {
    while (i < len && /\s/.test(cmd[i])) i++;
    if (i >= len) break;
    let token = '';
    const ch = cmd[i];
    if (ch === "'") {
      i++;
      while (i < len && cmd[i] !== "'") token += cmd[i++];
      if (i < len) i++;
    } else if (ch === '"') {
      i++;
      while (i < len && cmd[i] !== '"') {
        if (cmd[i] === '\\' && i + 1 < len) { i++; token += cmd[i++]; }
        else token += cmd[i++];
      }
      if (i < len) i++;
    } else {
      while (i < len && !/\s/.test(cmd[i])) {
        if (cmd[i] === '\\' && i + 1 < len && /\s/.test(cmd[i + 1])) {
          i++; token += cmd[i++];
        } else if (cmd[i] === "'") {
          i++;
          while (i < len && cmd[i] !== "'") token += cmd[i++];
          if (i < len) i++;
        } else if (cmd[i] === '"') {
          i++;
          while (i < len && cmd[i] !== '"') {
            if (cmd[i] === '\\' && i + 1 < len) { i++; token += cmd[i++]; }
            else token += cmd[i++];
          }
          if (i < len) i++;
        } else {
          token += cmd[i++];
        }
      }
    }
    tokens.push(token);
  }
  return tokens;
}

function parseCurl(raw: string): ParsedCurl {
  const normalised = raw.replace(/\\\n/g, ' ').trim();
  const args = tokeniseShell(normalised);
  if (!args[0] || args[0].toLowerCase() !== 'curl') throw new Error('Command must start with "curl".');
  let url = '';
  let method = '';
  const headers: Record<string, string> = {};
  let body: string | null = null;
  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '-X' || arg === '--request') {
      method = (args[++i] ?? '').toUpperCase();
    } else if (arg === '-H' || arg === '--header') {
      const raw2 = args[++i] ?? '';
      const colonIdx = raw2.indexOf(':');
      if (colonIdx !== -1) {
        headers[raw2.slice(0, colonIdx).trim()] = raw2.slice(colonIdx + 1).trim();
      }
    } else if (arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary') {
      body = args[++i] ?? '';
    } else if (arg === '-u' || arg === '--user') {
      headers['Authorization'] = `Basic ${btoa(args[++i] ?? '')}`;
    } else if (arg === '--compressed' || arg === '-s' || arg === '--silent' || arg === '-v' || arg === '--verbose' || arg === '-i' || arg === '--include' || arg === '-L' || arg === '--location') {
      // skip
    } else if (arg === '-o' || arg === '--output' || arg === '--max-time' || arg === '--connect-timeout' || arg === '-m' || arg === '--limit-rate' || arg === '-A' || arg === '--user-agent') {
      i++;
    } else if (!arg.startsWith('-')) {
      if (!url) url = arg;
    }
    i++;
  }
  if (!url) throw new Error('Could not find a URL in the cURL command.');
  if (!method) method = body ? 'POST' : 'GET';
  return { url, method, headers, body };
}

function emitFetch(parsed: ParsedCurl): string {
  const { url, method, headers, body } = parsed;
  const lines: string[] = [];
  lines.push(`const response = await fetch('${url}', {`);
  lines.push(`  method: '${method}',`);
  if (Object.keys(headers).length > 0) {
    lines.push('  headers: {');
    for (const [k, v] of Object.entries(headers)) lines.push(`    '${k}': '${v}',`);
    lines.push('  },');
  }
  if (body != null) {
    try {
      const bodyStr = JSON.stringify(JSON.parse(body), null, 2).split('\n').map((l, idx) => idx === 0 ? l : `  ${l}`).join('\n');
      lines.push(`  body: JSON.stringify(${bodyStr}),`);
    } catch {
      lines.push(`  body: '${body.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`);
    }
  }
  lines.push('});');
  lines.push('');
  lines.push('const data = await response.json();');
  return lines.join('\n');
}

function emitAxios(parsed: ParsedCurl): string {
  const { url, method, headers, body } = parsed;
  const lines: string[] = [];
  lines.push(`const response = await axios({`);
  lines.push(`  method: '${method.toLowerCase()}',`);
  lines.push(`  url: '${url}',`);
  if (Object.keys(headers).length > 0) {
    lines.push('  headers: {');
    for (const [k, v] of Object.entries(headers)) lines.push(`    '${k}': '${v}',`);
    lines.push('  },');
  }
  if (body != null) {
    try {
      const pretty = JSON.stringify(JSON.parse(body), null, 2).split('\n').map((l, idx) => idx === 0 ? l : `  ${l}`).join('\n');
      lines.push(`  data: ${pretty},`);
    } catch {
      lines.push(`  data: '${body.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`);
    }
  }
  lines.push('});');
  lines.push('');
  lines.push('const data = response.data;');
  return lines.join('\n');
}

function parseFetchToCurl(raw: string): string {
  const urlMatch = raw.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (!urlMatch) throw new Error('Could not find a fetch() call with a URL string in the input.');
  const url = urlMatch[1];
  let method = 'GET';
  const methodMatch = raw.match(/method\s*:\s*['"`]([A-Z]+)['"`]/i);
  if (methodMatch) method = methodMatch[1].toUpperCase();
  const parts: string[] = [`curl -X ${method} \\`];
  const headersBlockMatch = raw.match(/headers\s*:\s*\{([\s\S]+?)\}/);
  if (headersBlockMatch) {
    const headerPairs = headersBlockMatch[1].matchAll(/['"`]?([^'"`:\n]+)['"`]?\s*:\s*['"`]([^'"`\n]+)['"`]/g);
    for (const m of headerPairs) parts.push(`  -H '${m[1].trim()}: ${m[2].trim()}' \\`);
  }
  const bodyMatch = raw.match(/body\s*:\s*JSON\.stringify\s*\(([\s\S]+?)\)/) || raw.match(/body\s*:\s*['"`]([^'"`]+)['"`]/);
  if (bodyMatch) parts.push(`  --data-raw '${bodyMatch[1].trim().replace(/\n\s*/g, ' ')}' \\`);
  parts.push(`  '${url}'`);
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = last.replace(/ \\$/, '');
  return parts.join('\n');
}

export default function CurlConverterPage() {
  const [direction, setDirection] = useState<Direction>('curl-to-fetch');
  const [input, setInput] = useState('');
  const [outputTab, setOutputTab] = useState<OutputTab>('fetch');
  const [fetchOutput, setFetchOutput] = useState('');
  const [axiosOutput, setAxiosOutput] = useState('');
  const [curlOutput, setCurlOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isCurlToFetch = direction === 'curl-to-fetch';

  const handleConvert = () => {
    setError(null);
    setFetchOutput('');
    setAxiosOutput('');
    setCurlOutput('');
    if (!input.trim()) return;
    try {
      if (isCurlToFetch) {
        const parsed = parseCurl(input);
        setFetchOutput(emitFetch(parsed));
        setAxiosOutput(emitAxios(parsed));
      } else {
        setCurlOutput(parseFetchToCurl(input));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed.');
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setFetchOutput('');
    setAxiosOutput('');
    setCurlOutput('');
    setError(null);
  };

  const toggleDirection = () => {
    const next: Direction = isCurlToFetch ? 'fetch-to-curl' : 'curl-to-fetch';
    setDirection(next);
    setInput('');
    setFetchOutput('');
    setAxiosOutput('');
    setCurlOutput('');
    setError(null);
  };

  const currentOutput = isCurlToFetch ? (outputTab === 'fetch' ? fetchOutput : axiosOutput) : curlOutput;
  const hasOutput = !!(fetchOutput || axiosOutput || curlOutput);

  const inputPlaceholder = isCurlToFetch
    ? `curl -X POST 'https://api.example.com/data' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"key":"value"}'`
    : `const response = await fetch('https://api.example.com/data', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ key: 'value' }),\n});\nconst data = await response.json();`;

  return (
    <BpToolStage cat='api'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2 mb-1'>
          <Terminal className='w-5 h-5 text-gray-400' />
          <h1 className='text-xl sm:text-2xl font-semibold text-white'>cURL ↔ Fetch Converter</h1>
        </div>
        <p className='text-xs sm:text-sm text-gray-400'>Convert cURL commands to fetch / Axios snippets, or turn fetch code back into cURL</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          {/* Direction toggle */}
          <div className='flex items-center gap-3'>
            <div className='flex gap-1 p-1 rounded-lg bg-[#1a1a1a] border border-[hsla(0,0%,20%,1)]'>
              <button onClick={() => { setDirection('curl-to-fetch'); handleInputChange(''); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${direction === 'curl-to-fetch' ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'}`}>
                cURL → fetch
              </button>
              <button onClick={() => { setDirection('fetch-to-curl'); handleInputChange(''); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${direction === 'fetch-to-curl' ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'}`}>
                fetch → cURL
              </button>
            </div>
            <button className='bp-btn' onClick={toggleDirection} title='Swap direction' type='button'>
              <ArrowLeftRight className='w-4 h-4' />
            </button>
          </div>

          {/* Two-panel layout */}
          <div className='bp-layout-2col'>
            <BpPanel title={isCurlToFetch ? 'cURL Command' : 'fetch() Code'}>
              <textarea
                className='bp-textarea font-mono text-xs leading-relaxed mb-3'
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={inputPlaceholder}
                rows={14}
              />
              <button className='bp-btn bp-btn-solid w-full' onClick={handleConvert} disabled={!input.trim()} type='button'>
                {isCurlToFetch ? 'CONVERT TO FETCH & AXIOS' : 'CONVERT TO CURL'}
              </button>
            </BpPanel>

            <BpPanel title={isCurlToFetch ? 'Output' : 'cURL Command'}>
              <div className='flex items-center justify-between mb-3'>
                {isCurlToFetch ? (
                  <div className='flex gap-1 p-0.5 rounded-md bg-[#1a1a1a] border border-[hsla(0,0%,15%,1)]'>
                    {(['fetch', 'axios'] as OutputTab[]).map((t) => (
                      <button key={t} onClick={() => setOutputTab(t)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 ${outputTab === t ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'}`}>
                        {t === 'fetch' ? 'fetch()' : 'Axios'}
                      </button>
                    ))}
                  </div>
                ) : <span />}
                <BpCopyBtn text={currentOutput} label='COPY' />
              </div>
              <div className='bp-code-view min-h-56'>
                {currentOutput ? (
                  <pre className='bp-code-pre'>{currentOutput}</pre>
                ) : (
                  <span className='text-gray-600 text-xs'>Output will appear here</span>
                )}
              </div>
            </BpPanel>
          </div>

          {error && (
            <div className='flex items-start gap-3 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
              <div>
                <p className='text-sm font-semibold text-red-400 mb-1'>Conversion Failed</p>
                <p className='text-xs text-red-300'>{error}</p>
              </div>
            </div>
          )}

          {!hasOutput && !error && (
            <BpPanel title='Supported cURL flags'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-500 font-mono'>
                <span>-X / --request METHOD</span>
                <span>-H / --header "Key: Value"</span>
                <span>-d / --data / --data-raw body</span>
                <span>-u user:pass (Basic Auth)</span>
                <span>--compressed, -s, -v, -L</span>
                <span>-A / --user-agent</span>
              </div>
            </BpPanel>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
