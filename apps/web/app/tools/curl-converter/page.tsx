'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

type Direction = 'curl-to-fetch' | 'fetch-to-curl';
type OutputTab = 'fetch' | 'node-fetch' | 'axios';
type InputFormat = 'multiline' | 'single-line';

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
    } else if (
      arg === '--compressed' || arg === '-s' || arg === '--silent' ||
      arg === '-v' || arg === '--verbose' || arg === '-i' || arg === '--include' ||
      arg === '-L' || arg === '--location'
    ) {
      // skip
    } else if (
      arg === '-o' || arg === '--output' || arg === '--max-time' ||
      arg === '--connect-timeout' || arg === '-m' || arg === '--limit-rate' ||
      arg === '-A' || arg === '--user-agent'
    ) {
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

function emitNodeFetch(parsed: ParsedCurl): string {
  const { url, method, headers, body } = parsed;
  const lines: string[] = [];
  lines.push(`import fetch from 'node-fetch';`);
  lines.push('');
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

function parseFetchToCurl(raw: string, format: InputFormat): string {
  const urlMatch = raw.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (!urlMatch) throw new Error('Could not find a fetch() call with a URL string in the input.');
  const url = urlMatch[1];
  let method = 'GET';
  const methodMatch = raw.match(/method\s*:\s*['"`]([A-Z]+)['"`]/i);
  if (methodMatch) method = methodMatch[1].toUpperCase();
  const headerParts: string[] = [];
  const headersBlockMatch = raw.match(/headers\s*:\s*\{([\s\S]+?)\}/);
  if (headersBlockMatch) {
    const pairs = headersBlockMatch[1].matchAll(/['"`]?([^'"`:\n]+)['"`]?\s*:\s*['"`]([^'"`\n]+)['"`]/g);
    for (const m of pairs) headerParts.push(`-H '${m[1].trim()}: ${m[2].trim()}'`);
  }
  let bodyPart = '';
  const bodyMatch = raw.match(/body\s*:\s*JSON\.stringify\s*\(([\s\S]+?)\)/) || raw.match(/body\s*:\s*['"`]([^'"`]+)['"`]/);
  if (bodyMatch) bodyPart = `--data-raw '${bodyMatch[1].trim().replace(/\n\s*/g, ' ')}'`;
  if (format === 'single-line') {
    const parts = [`curl -X ${method}`];
    headerParts.forEach(h => parts.push(h));
    if (bodyPart) parts.push(bodyPart);
    parts.push(`'${url}'`);
    return parts.join(' ');
  }
  const lines = [`curl -X ${method} \\`];
  headerParts.forEach(h => lines.push(`  ${h} \\`));
  if (bodyPart) lines.push(`  ${bodyPart} \\`);
  lines.push(`  '${url}'`);
  const last = lines[lines.length - 1];
  lines[lines.length - 1] = last.replace(/ \\$/, '');
  return lines.join('\n');
}

function toSingleLine(curl: string): string {
  return curl.replace(/\s*\\\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function toMultiLine(curl: string): string {
  const single = toSingleLine(curl);
  const parts = single.split(/(?= -)/);
  if (parts.length <= 1) return single;
  return parts[0] + ' \\\n' + parts.slice(1).map(p => '  ' + p.trim()).join(' \\\n');
}

export default function CurlConverterPage() {
  const [direction, setDirection] = useState<Direction>('curl-to-fetch');
  const [input, setInput] = useState('');
  const [outputTab, setOutputTab] = useState<OutputTab>('fetch');
  const [inputFormat, setInputFormat] = useState<InputFormat>('multiline');
  const [fetchOutput, setFetchOutput] = useState('');
  const [nodeFetchOutput, setNodeFetchOutput] = useState('');
  const [axiosOutput, setAxiosOutput] = useState('');
  const [curlOutput, setCurlOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isCurlToFetch = direction === 'curl-to-fetch';

  useEffect(() => {
    if (!input.trim()) {
      setFetchOutput(''); setNodeFetchOutput(''); setAxiosOutput(''); setCurlOutput(''); setError(null);
      return;
    }
    try {
      setError(null);
      if (isCurlToFetch) {
        const parsed = parseCurl(input);
        setFetchOutput(emitFetch(parsed));
        setNodeFetchOutput(emitNodeFetch(parsed));
        setAxiosOutput(emitAxios(parsed));
      } else {
        setCurlOutput(parseFetchToCurl(input, inputFormat));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed.');
    }
  }, [input, isCurlToFetch, inputFormat]);

  const switchDirection = (d: Direction) => {
    setDirection(d);
    setInput('');
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const currentOutput = isCurlToFetch
    ? (outputTab === 'fetch' ? fetchOutput : outputTab === 'node-fetch' ? nodeFetchOutput : axiosOutput)
    : curlOutput;

  const curlPlaceholder = inputFormat === 'multiline'
    ? `curl -X POST 'https://api.atomicdevtools.com/v1/sessions' \\\n  -H 'Authorization: Bearer ey3MAD32L' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"email":"atlas@atomicdevtools.com","remember": true}'`
    : `curl -X POST 'https://api.atomicdevtools.com/v1/sessions' -H 'Authorization: Bearer ey3MAD32L' -H 'Content-Type: application/json' -d '{"email":"atlas@atomicdevtools.com","remember":true}'`;

  const fetchPlaceholder = `const response = await fetch('https://api.atomicdevtools.com/v1/sessions', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ey3MAD32L',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    email: 'atlas@atomicdevtools.com',\n    remember: true,\n  }),\n});\nconst data = await response.json();`;

  const inputPlaceholder = isCurlToFetch ? curlPlaceholder : fetchPlaceholder;

  const handleInputFormatChange = (fmt: InputFormat) => {
    setInputFormat(fmt);
    if (isCurlToFetch && input.trim()) {
      setInput(fmt === 'single-line' ? toSingleLine(input) : toMultiLine(input));
    }
  };

  return (
    // Bypass BpToolStage — use the bp-tool-root shell classes directly so we can
    // control overflow ourselves and keep the bottom tab bars always in view.
    <div
      className='bp-tool-root h-full flex flex-col overflow-hidden'
      data-cat='api'
      style={{
        backgroundImage: `
          linear-gradient(var(--bp-line-major) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-line-major) 1px, transparent 1px),
          linear-gradient(var(--bp-line-minor) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-line-minor) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px, 64px 64px, 8px 8px, 8px 8px',
        backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px',
      }}
    >
      {/* Tool header */}
      <div className='tool-topbar flex-shrink-0'>
        <Terminal className='w-3.5 h-3.5 flex-shrink-0' style={{ color: 'var(--bp-ink-mute)' }} />
        <span className='tool-sep'>/</span>
        <span className='tool-name'>cURL ↔ Fetch</span>
        {/* Direction tabs */}
        <div
          className='flex gap-px ml-3'
          style={{
            padding: '2px',
            background: 'var(--bp-bg)',
            border: '1px solid var(--bp-border-str)',
          }}
        >
          {(['curl-to-fetch', 'fetch-to-curl'] as Direction[]).map((d) => (
            <button
              key={d}
              onClick={() => switchDirection(d)}
              style={{
                padding: '3px 10px',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms, border-color 120ms',
                background: direction === d ? 'var(--bp-accent)' : 'transparent',
                color: direction === d ? 'var(--bp-bg)' : 'var(--bp-ink-mute)',
                borderColor: direction === d ? 'var(--bp-accent)' : 'transparent',
              }}
            >
              {d === 'curl-to-fetch' ? 'cURL → Fetch' : 'Fetch → cURL'}
            </button>
          ))}
        </div>
        <div className='tool-spacer' />
      </div>

      {/* Split editor — flex-1 with overflow-hidden so children can fill height */}
      <div className='flex-1 flex overflow-hidden min-h-0'>
        {/* Left pane */}
        <div
          className='flex-1 flex flex-col min-w-0 min-h-0'
          style={{ borderRight: '1px solid var(--bp-border)' }}
        >
          <div className='flex-1 min-h-0 relative'>
            <textarea
              ref={inputRef}
              className='absolute inset-0 w-full h-full resize-none outline-none p-4 font-mono text-xs leading-relaxed'
              style={{
                background: 'transparent',
                color: 'var(--bp-ink)',
                fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                fontSize: '12px',
                caretColor: 'var(--bp-accent)',
                border: 'none',
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              spellCheck={false}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
            />
          </div>
          {/* Left bottom bar */}
          <div
            className='flex items-center justify-between px-3 flex-shrink-0'
            style={{
              height: '32px',
              background: 'var(--bp-surface)',
              borderTop: '1px solid var(--bp-border)',
            }}
          >
            {isCurlToFetch ? (
              <div className='flex gap-px'>
                {(['multiline', 'single-line'] as InputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleInputFormatChange(fmt)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontFamily: 'inherit',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 100ms, color 100ms',
                      background: inputFormat === fmt ? 'var(--bp-border-str)' : 'transparent',
                      color: inputFormat === fmt ? 'var(--bp-ink)' : 'var(--bp-ink-faint)',
                    }}
                  >
                    {fmt === 'multiline' ? 'Multiline' : 'Single Line'}
                  </button>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--bp-ink-faint)', letterSpacing: '0.1em', fontFamily: 'inherit' }}>
                FETCH()
              </span>
            )}
            {error && (
              <span style={{ fontSize: '10px', color: '#ff7a85', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {error}
              </span>
            )}
          </div>
        </div>

        {/* Right pane */}
        <div className='flex-1 flex flex-col min-w-0 min-h-0'>
          <div className='flex-1 min-h-0 relative overflow-auto'>
            <pre
              className='absolute inset-0 p-4 m-0 font-mono text-xs leading-relaxed overflow-auto'
              style={{
                background: 'transparent',
                fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                fontSize: '12px',
                color: currentOutput ? 'var(--bp-ink)' : 'var(--bp-ink-faint)',
              }}
            >
              {currentOutput || (
                isCurlToFetch
                  ? outputTab === 'fetch'
                    ? `await fetch('https://api.atomicdevtools.com/v1/sessions', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ey3MAD32L',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    email: 'atlas@atomicdevtools.com',\n    remember: true,\n  }),\n});\nconst data = await response.json();`
                    : outputTab === 'node-fetch'
                    ? `import fetch from 'node-fetch';\n\nawait fetch('https://api.atomicdevtools.com/v1/sessions', {\n  method: 'POST',\n  // ...same as fetch()\n});`
                    : `await axios({\n  method: 'post',\n  url: 'https://api.atomicdevtools.com/v1/sessions',\n  headers: { ... },\n  data: { ... },\n});\nconst data = response.data;`
                  : `curl -X POST \\\n  -H 'Authorization: Bearer ey3MAD32L' \\\n  -H 'Content-Type: application/json' \\\n  --data-raw '{"email":"atlas@atomicdevtools.com","remember":true}' \\\n  'https://api.atomicdevtools.com/v1/sessions'`
              )}
            </pre>
          </div>
          {/* Right bottom bar */}
          <div
            className='flex items-center justify-between px-3 flex-shrink-0'
            style={{
              height: '32px',
              background: 'var(--bp-surface)',
              borderTop: '1px solid var(--bp-border)',
            }}
          >
            {isCurlToFetch ? (
              <div className='flex gap-px'>
                {([
                  { key: 'fetch', label: 'fetch()' },
                  { key: 'node-fetch', label: 'node-fetch' },
                  { key: 'axios', label: 'Axios' },
                ] as { key: OutputTab; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setOutputTab(key)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontFamily: 'inherit',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 100ms, color 100ms',
                      background: outputTab === key ? 'var(--bp-border-str)' : 'transparent',
                      color: outputTab === key ? 'var(--bp-ink)' : 'var(--bp-ink-faint)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className='flex gap-px'>
                {(['multiline', 'single-line'] as InputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setInputFormat(fmt)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontFamily: 'inherit',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 100ms, color 100ms',
                      background: inputFormat === fmt ? 'var(--bp-border-str)' : 'transparent',
                      color: inputFormat === fmt ? 'var(--bp-ink)' : 'var(--bp-ink-faint)',
                    }}
                  >
                    {fmt === 'multiline' ? 'Multiline' : 'Single Line'}
                  </button>
                ))}
              </div>
            )}
            <BpCopyBtn text={currentOutput} label='COPY' />
          </div>
        </div>
      </div>
    </div>
  );
}
