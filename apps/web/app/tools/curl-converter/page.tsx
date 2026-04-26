'use client';

import { useState } from 'react';
import { Terminal, Copy, Check, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { Button, Card, CardContent, Textarea } from '@/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

type Direction = 'curl-to-fetch' | 'fetch-to-curl';
type OutputTab = 'fetch' | 'axios';

// ─── cURL parser ──────────────────────────────────────────────────────────────

/**
 * Tokenise a shell command string into args, handling single/double quotes
 * and basic backslash escapes. Does not handle $() or heredocs.
 */
function tokeniseShell(cmd: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = cmd.length;

  while (i < len) {
    // skip whitespace
    while (i < len && /\s/.test(cmd[i])) i++;
    if (i >= len) break;

    let token = '';
    const ch = cmd[i];

    if (ch === "'" ) {
      // single-quoted string — no escaping
      i++;
      while (i < len && cmd[i] !== "'") token += cmd[i++];
      if (i < len) i++; // closing quote
    } else if (ch === '"') {
      // double-quoted string — handle \"
      i++;
      while (i < len && cmd[i] !== '"') {
        if (cmd[i] === '\\' && i + 1 < len) {
          i++;
          token += cmd[i++];
        } else {
          token += cmd[i++];
        }
      }
      if (i < len) i++; // closing quote
    } else {
      // unquoted token — stop at whitespace, but handle \<space>
      while (i < len && !/\s/.test(cmd[i])) {
        if (cmd[i] === '\\' && i + 1 < len && /\s/.test(cmd[i + 1])) {
          // escaped space — include the space
          i++;
          token += cmd[i++];
        } else if (cmd[i] === "'") {
          // embedded single-quote block
          i++;
          while (i < len && cmd[i] !== "'") token += cmd[i++];
          if (i < len) i++;
        } else if (cmd[i] === '"') {
          // embedded double-quote block
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
  // Normalise line-continuation backslashes
  const normalised = raw.replace(/\\\n/g, ' ').trim();
  const args = tokeniseShell(normalised);

  if (!args[0] || args[0].toLowerCase() !== 'curl') {
    throw new Error('Command must start with "curl".');
  }

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
      const raw = args[++i] ?? '';
      const colonIdx = raw.indexOf(':');
      if (colonIdx !== -1) {
        const k = raw.slice(0, colonIdx).trim();
        const v = raw.slice(colonIdx + 1).trim();
        headers[k] = v;
      }
    } else if (arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary') {
      body = args[++i] ?? '';
    } else if (arg === '-u' || arg === '--user') {
      const creds = args[++i] ?? '';
      headers['Authorization'] = `Basic ${btoa(creds)}`;
    } else if (arg === '--compressed') {
      // ignore — handled by browser automatically
    } else if (arg === '-s' || arg === '--silent' || arg === '-v' || arg === '--verbose' || arg === '-i' || arg === '--include' || arg === '-L' || arg === '--location') {
      // flags with no value — skip
    } else if (arg === '-o' || arg === '--output' || arg === '--max-time' || arg === '--connect-timeout' || arg === '-m' || arg === '--limit-rate' || arg === '-A' || arg === '--user-agent') {
      i++; // flag with one value — skip both
    } else if (!arg.startsWith('-')) {
      // positional — URL
      if (!url) url = arg;
    }
    i++;
  }

  if (!url) throw new Error('Could not find a URL in the cURL command.');

  // Infer method
  if (!method) method = body ? 'POST' : 'GET';

  return { url, method, headers, body };
}

// ─── fetch emitter ────────────────────────────────────────────────────────────

function emitFetch(parsed: ParsedCurl): string {
  const { url, method, headers, body } = parsed;
  const lines: string[] = [];

  lines.push(`const response = await fetch('${url}', {`);
  lines.push(`  method: '${method}',`);

  if (Object.keys(headers).length > 0) {
    lines.push('  headers: {');
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`    '${k}': '${v}',`);
    }
    lines.push('  },');
  }

  if (body != null) {
    // Try to pretty-print if JSON
    let bodyStr = body;
    try {
      bodyStr = JSON.stringify(JSON.parse(body), null, 2)
        .split('\n')
        .map((l, idx) => (idx === 0 ? l : `  ${l}`))
        .join('\n');
      lines.push(`  body: JSON.stringify(${bodyStr}),`);
    } catch {
      // raw string body
      const escaped = body.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      lines.push(`  body: '${escaped}',`);
    }
  }

  lines.push('});');
  lines.push('');
  lines.push('const data = await response.json();');

  return lines.join('\n');
}

// ─── Axios emitter ────────────────────────────────────────────────────────────

function emitAxios(parsed: ParsedCurl): string {
  const { url, method, headers, body } = parsed;
  const lines: string[] = [];

  lines.push(`const response = await axios({`);
  lines.push(`  method: '${method.toLowerCase()}',`);
  lines.push(`  url: '${url}',`);

  if (Object.keys(headers).length > 0) {
    lines.push('  headers: {');
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`    '${k}': '${v}',`);
    }
    lines.push('  },');
  }

  if (body != null) {
    try {
      const pretty = JSON.stringify(JSON.parse(body), null, 2)
        .split('\n')
        .map((l, idx) => (idx === 0 ? l : `  ${l}`))
        .join('\n');
      lines.push(`  data: ${pretty},`);
    } catch {
      const escaped = body.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      lines.push(`  data: '${escaped}',`);
    }
  }

  lines.push('});');
  lines.push('');
  lines.push('const data = response.data;');

  return lines.join('\n');
}

// ─── fetch → cURL emitter ─────────────────────────────────────────────────────

function parseFetchToCurl(raw: string): string {
  // Best-effort: extract URL, method, headers, body from a fetch() call.
  const urlMatch = raw.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (!urlMatch) throw new Error('Could not find a fetch() call with a URL string in the input.');

  const url = urlMatch[1];
  const lines: string[] = [`curl -X GET`];
  let method = 'GET';

  const methodMatch = raw.match(/method\s*:\s*['"`]([A-Z]+)['"`]/i);
  if (methodMatch) method = methodMatch[1].toUpperCase();

  lines[0] = `curl -X ${method} \\`;

  // Headers
  const headersBlockMatch = raw.match(/headers\s*:\s*\{([\s\S]+?)\}/);
  const headerLines: string[] = [];
  if (headersBlockMatch) {
    const headersStr = headersBlockMatch[1];
    const headerPairs = headersStr.matchAll(/['"`]?([^'"`:\n]+)['"`]?\s*:\s*['"`]([^'"`\n]+)['"`]/g);
    for (const m of headerPairs) {
      headerLines.push(`  -H '${m[1].trim()}: ${m[2].trim()}' \\`);
    }
  }

  // Body
  const bodyMatch = raw.match(/body\s*:\s*JSON\.stringify\s*\(([\s\S]+?)\)/) ||
                    raw.match(/body\s*:\s*['"`]([^'"`]+)['"`]/);
  let bodyLine: string | null = null;
  if (bodyMatch) {
    const bodyRaw = bodyMatch[1].trim().replace(/\n\s*/g, ' ');
    bodyLine = `  --data-raw '${bodyRaw}' \\`;
  }

  const parts = [lines[0], ...headerLines];
  if (bodyLine) parts.push(bodyLine);
  parts.push(`  '${url}'`);

  // Remove trailing backslash from last line
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = last.replace(/ \\$/, '');

  return parts.join('\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CurlConverterPage() {
  const [direction, setDirection] = useState<Direction>('curl-to-fetch');
  const [input, setInput] = useState('');
  const [outputTab, setOutputTab] = useState<OutputTab>('fetch');
  const [fetchOutput, setFetchOutput] = useState('');
  const [axiosOutput, setAxiosOutput] = useState('');
  const [curlOutput, setCurlOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isCurlToFetch = direction === 'curl-to-fetch';

  const handleConvert = () => {
    setError(null);
    setFetchOutput('');
    setAxiosOutput('');
    setCurlOutput('');
    setCopied(false);

    if (!input.trim()) return;

    try {
      if (isCurlToFetch) {
        const parsed = parseCurl(input);
        setFetchOutput(emitFetch(parsed));
        setAxiosOutput(emitAxios(parsed));
      } else {
        const curlCmd = parseFetchToCurl(input);
        setCurlOutput(curlCmd);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed.');
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    // Reset outputs when input changes
    setFetchOutput('');
    setAxiosOutput('');
    setCurlOutput('');
    setError(null);
    setCopied(false);
  };

  const toggleDirection = () => {
    const next: Direction = isCurlToFetch ? 'fetch-to-curl' : 'curl-to-fetch';
    setDirection(next);
    setInput('');
    setFetchOutput('');
    setAxiosOutput('');
    setCurlOutput('');
    setError(null);
    setCopied(false);
  };

  const currentOutput = isCurlToFetch
    ? (outputTab === 'fetch' ? fetchOutput : axiosOutput)
    : curlOutput;

  const copyOutput = async () => {
    if (!currentOutput) return;
    try {
      await navigator.clipboard.writeText(currentOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const inputPlaceholder = isCurlToFetch
    ? `curl -X POST 'https://api.example.com/data' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer token' \\\n  -d '{"key":"value"}'`
    : `const response = await fetch('https://api.example.com/data', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer token',\n  },\n  body: JSON.stringify({ key: 'value' }),\n});\nconst data = await response.json();`;

  const hasOutput = !!(fetchOutput || axiosOutput || curlOutput);

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2 mb-1'>
          <Terminal className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>cURL ↔ Fetch Converter</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground'>
          Convert cURL commands to fetch / Axios snippets, or turn fetch code back into cURL
        </p>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          {/* Direction toggle */}
          <div className='flex items-center gap-3'>
            <div className='flex gap-1 p-1 rounded-lg bg-[#1a1a1a] border border-border'>
              <button
                onClick={() => { setDirection('curl-to-fetch'); setInput(''); setFetchOutput(''); setAxiosOutput(''); setCurlOutput(''); setError(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${direction === 'curl-to-fetch' ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground'}`}
              >
                cURL → fetch
              </button>
              <button
                onClick={() => { setDirection('fetch-to-curl'); setInput(''); setFetchOutput(''); setAxiosOutput(''); setCurlOutput(''); setError(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${direction === 'fetch-to-curl' ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground'}`}
              >
                fetch → cURL
              </button>
            </div>
            <Button variant='outline' size='sm' onClick={toggleDirection} title='Swap direction'>
              <ArrowLeftRight className='w-4 h-4' />
            </Button>
          </div>

          {/* Two-panel layout */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>

            {/* Input panel */}
            <Card>
              <CardContent className='pt-5 space-y-3'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-medium text-gray-300'>
                    {isCurlToFetch ? 'cURL Command' : 'fetch() Code'}
                  </p>
                </div>
                <Textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={inputPlaceholder}
                  rows={14}
                  className='font-mono text-xs leading-relaxed'
                />
                <Button onClick={handleConvert} disabled={!input.trim()} className='w-full'>
                  {isCurlToFetch ? 'Convert to fetch & Axios' : 'Convert to cURL'}
                </Button>
              </CardContent>
            </Card>

            {/* Output panel */}
            <Card>
              <CardContent className='pt-5 space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    {isCurlToFetch ? (
                      <div className='flex gap-1 p-0.5 rounded-md bg-[#1a1a1a] border border-border'>
                        {(['fetch', 'axios'] as OutputTab[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => setOutputTab(t)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 ${outputTab === t ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {t === 'fetch' ? 'fetch()' : 'Axios'}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className='text-sm font-medium text-gray-300'>cURL Command</p>
                    )}
                  </div>
                  <Button variant='outline' size='sm' onClick={copyOutput} disabled={!currentOutput}>
                    {copied ? (
                      <><Check className='w-4 h-4 mr-1.5' />Copied</>
                    ) : (
                      <><Copy className='w-4 h-4 mr-1.5' />Copy</>
                    )}
                  </Button>
                </div>

                {currentOutput ? (
                  <pre className='bg-[#0d0d0d] rounded-md p-4 text-xs font-mono overflow-x-auto leading-relaxed text-gray-200 min-h-[14rem]'>
                    {currentOutput}
                  </pre>
                ) : (
                  <div className='bg-[#0d0d0d] rounded-md p-4 min-h-[14rem] flex items-center justify-center'>
                    <p className='text-xs text-muted-foreground'>Output will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Error */}
          {error && (
            <Card className='border-red-900 bg-red-950/30'>
              <CardContent className='pt-5'>
                <div className='flex items-start gap-3'>
                  <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='text-sm font-semibold text-red-400 mb-1'>Conversion Failed</p>
                    <p className='text-xs text-red-300'>{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help card */}
          {!hasOutput && !error && (
            <Card className='border-dashed'>
              <CardContent className='pt-5 pb-5'>
                <p className='text-xs text-muted-foreground font-medium mb-2'>Supported cURL flags:</p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground font-mono'>
                  <span>-X / --request METHOD</span>
                  <span>-H / --header "Key: Value"</span>
                  <span>-d / --data / --data-raw body</span>
                  <span>-u user:pass (Basic Auth)</span>
                  <span>--compressed, -s, -v, -L</span>
                  <span>-A / --user-agent</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
