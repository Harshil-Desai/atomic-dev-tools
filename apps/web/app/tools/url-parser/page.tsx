'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, Copy, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/ui';

interface QueryParam {
  id: number;
  key: string;
  value: string;
}

type Tab = 'parse' | 'build';

let nextId = 1;
function makeParam(key = '', value = ''): QueryParam {
  return { id: nextId++, key, value };
}

// ---- Parse tab helpers ----

interface ParsedURL {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  params: QueryParam[];
}

function parseURL(raw: string): ParsedURL {
  const u = new URL(raw);
  const params: QueryParam[] = [];
  u.searchParams.forEach((v, k) => {
    params.push(makeParam(k, v));
  });
  if (params.length === 0) params.push(makeParam());
  return {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port,
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
    origin: u.origin,
    params,
  };
}

function rebuildFromParsed(base: string, params: QueryParam[]): string {
  try {
    const u = new URL(base);
    u.search = '';
    for (const p of params) {
      if (p.key.trim()) u.searchParams.append(p.key.trim(), p.value);
    }
    return u.toString();
  } catch {
    return base;
  }
}

// ---- Build tab helpers ----

function assembleURL(
  protocol: string,
  hostname: string,
  port: string,
  pathname: string,
  params: QueryParam[],
  hash: string,
): string {
  if (!hostname.trim()) return '';
  try {
    const portPart = port.trim() ? `:${port.trim()}` : '';
    const pathPart = pathname.startsWith('/') ? pathname : `/${pathname}`;
    let raw = `${protocol}//${hostname.trim()}${portPart}${pathPart}`;
    if (hash.trim()) raw += `#${hash.replace(/^#/, '')}`;
    const u = new URL(raw);
    u.search = '';
    for (const p of params) {
      if (p.key.trim()) u.searchParams.append(p.key.trim(), p.value);
    }
    return u.toString();
  } catch {
    return '';
  }
}

// ---- Component ----

export default function URLParserPage() {
  const [tab, setTab] = useState<Tab>('parse');

  // ----- Parse tab state -----
  const [parseInput, setParseInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedURL | null>(null);
  const [parseParams, setParseParams] = useState<QueryParam[]>([makeParam()]);
  const [copiedParse, setCopiedParse] = useState(false);

  // ----- Build tab state -----
  const [buildProtocol, setBuildProtocol] = useState('https:');
  const [buildHostname, setBuildHostname] = useState('');
  const [buildPort, setBuildPort] = useState('');
  const [buildPathname, setBuildPathname] = useState('/');
  const [buildHash, setBuildHash] = useState('');
  const [buildParams, setBuildParams] = useState<QueryParam[]>([makeParam()]);
  const [builtURL, setBuiltURL] = useState('');
  const [copiedBuild, setCopiedBuild] = useState(false);

  // ----- Parse tab logic -----

  const handleParseInputChange = (value: string) => {
    setParseInput(value);
    if (!value.trim()) {
      setParsedData(null);
      setParseError(null);
      setParseParams([makeParam()]);
      return;
    }
    try {
      const result = parseURL(value.trim());
      setParsedData(result);
      setParseParams(result.params);
      setParseError(null);
    } catch {
      setParsedData(null);
      setParseError('Invalid URL. Make sure it includes a protocol (e.g. https://).');
    }
  };

  const handleParseParamChange = (id: number, field: 'key' | 'value', val: string) => {
    const updated = parseParams.map((p) => (p.id === id ? { ...p, [field]: val } : p));
    setParseParams(updated);
    if (parsedData) {
      const rebuilt = rebuildFromParsed(parsedData.origin + parsedData.pathname + parsedData.hash, updated);
      setParseInput(rebuilt);
      try {
        const re = parseURL(rebuilt);
        setParsedData(re);
      } catch {
        // keep old parsed data for display except params
      }
    }
  };

  const addParseParam = () => setParseParams((prev) => [...prev, makeParam()]);

  const removeParseParam = (id: number) => {
    const updated = parseParams.filter((p) => p.id !== id);
    if (updated.length === 0) updated.push(makeParam());
    setParseParams(updated);
    if (parsedData) {
      const rebuilt = rebuildFromParsed(parsedData.origin + parsedData.pathname + parsedData.hash, updated);
      setParseInput(rebuilt);
      try {
        const re = parseURL(rebuilt);
        setParsedData(re);
      } catch {}
    }
  };

  const copyParse = async () => {
    if (!parseInput.trim()) return;
    try {
      await navigator.clipboard.writeText(parseInput.trim());
      setCopiedParse(true);
      setTimeout(() => setCopiedParse(false), 2000);
    } catch {}
  };

  // ----- Build tab logic -----

  const rebuildBuiltURL = useCallback(() => {
    const url = assembleURL(buildProtocol, buildHostname, buildPort, buildPathname, buildParams, buildHash);
    setBuiltURL(url);
  }, [buildProtocol, buildHostname, buildPort, buildPathname, buildParams, buildHash]);

  useEffect(() => {
    rebuildBuiltURL();
  }, [rebuildBuiltURL]);

  const handleBuildParamChange = (id: number, field: 'key' | 'value', val: string) => {
    setBuildParams((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const addBuildParam = () => setBuildParams((prev) => [...prev, makeParam()]);

  const removeBuildParam = (id: number) => {
    setBuildParams((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      return updated.length === 0 ? [makeParam()] : updated;
    });
  };

  const copyBuild = async () => {
    if (!builtURL) return;
    try {
      await navigator.clipboard.writeText(builtURL);
      setCopiedBuild(true);
      setTimeout(() => setCopiedBuild(false), 2000);
    } catch {}
  };

  const infoRow = (label: string, value: string, mono = true) =>
    value ? (
      <div className='flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-sm'>
        <span className='text-muted-foreground w-24 flex-shrink-0'>{label}</span>
        <span className={`text-foreground break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
      </div>
    ) : null;

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2 mb-1'>
          <Link className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>URL Parser & Builder</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground'>
          Break down URLs into their components and rebuild them from scratch
        </p>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Tab switcher */}
          <div className='flex gap-1 p-1 rounded-lg bg-[#1a1a1a] border border-border w-fit'>
            {(['parse', 'build'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  tab === t
                    ? 'bg-white text-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'parse' ? 'Parse' : 'Build'}
              </button>
            ))}
          </div>

          {/* ---- PARSE TAB ---- */}
          {tab === 'parse' && (
            <>
              {/* URL input */}
              <Card>
                <CardContent className='pt-5 space-y-3'>
                  <label className='block text-sm font-medium text-gray-300'>Full URL</label>
                  <div className='flex gap-2'>
                    <Input
                      value={parseInput}
                      onChange={(e) => handleParseInputChange(e.target.value)}
                      placeholder='https://example.com/path?foo=bar&baz=1#section'
                      className='font-mono text-sm flex-1'
                    />
                    <Button variant='outline' size='sm' onClick={copyParse} disabled={!parseInput.trim()}>
                      {copiedParse ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Error */}
              {parseError && (
                <Card className='border-red-900 bg-red-950/30'>
                  <CardContent className='pt-5'>
                    <div className='flex items-start gap-3'>
                      <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                      <p className='text-sm text-red-300'>{parseError}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Parsed breakdown */}
              {parsedData && (
                <>
                  <Card>
                    <CardContent className='pt-5 space-y-3'>
                      <p className='text-sm font-medium text-gray-300'>URL Components</p>
                      <div className='space-y-2'>
                        {infoRow('Protocol', parsedData.protocol)}
                        {infoRow('Origin', parsedData.origin)}
                        {infoRow('Hostname', parsedData.hostname)}
                        {infoRow('Port', parsedData.port || '(default)')}
                        {infoRow('Pathname', parsedData.pathname)}
                        {infoRow('Search', parsedData.search || '(none)')}
                        {infoRow('Hash', parsedData.hash || '(none)')}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Editable query params */}
                  <Card>
                    <CardContent className='pt-5 space-y-3'>
                      <div className='flex items-center justify-between'>
                        <p className='text-sm font-medium text-gray-300'>Query Parameters</p>
                        <Button variant='outline' size='sm' onClick={addParseParam}>
                          <Plus className='w-3.5 h-3.5 mr-1' />Add
                        </Button>
                      </div>
                      {parseParams.map((p) => (
                        <div key={p.id} className='flex items-center gap-2'>
                          <Input
                            value={p.key}
                            onChange={(e) => handleParseParamChange(p.id, 'key', e.target.value)}
                            placeholder='key'
                            className='font-mono text-sm flex-1'
                          />
                          <span className='text-muted-foreground'>=</span>
                          <Input
                            value={p.value}
                            onChange={(e) => handleParseParamChange(p.id, 'value', e.target.value)}
                            placeholder='value'
                            className='font-mono text-sm flex-1'
                          />
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => removeParseParam(p.id)}
                            className='flex-shrink-0'
                          >
                            <Trash2 className='w-4 h-4 text-muted-foreground' />
                          </Button>
                        </div>
                      ))}
                      <p className='text-xs text-muted-foreground'>
                        Editing params rebuilds the URL above in real time.
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {!parseInput && (
                <Card className='border-dashed'>
                  <CardContent className='pt-6'>
                    <div className='text-center text-gray-500 py-8'>
                      <Link className='w-10 h-10 mx-auto mb-3 opacity-40' />
                      <p className='text-sm'>Paste a URL above to inspect its parts</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ---- BUILD TAB ---- */}
          {tab === 'build' && (
            <>
              <Card>
                <CardContent className='pt-5 space-y-4'>
                  <p className='text-sm font-medium text-gray-300'>URL Parts</p>

                  {/* Protocol + hostname + port */}
                  <div className='flex flex-col sm:flex-row gap-2'>
                    <select
                      value={buildProtocol}
                      onChange={(e) => setBuildProtocol(e.target.value)}
                      className='h-10 px-3 rounded-md border border-border bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-32'
                    >
                      <option value='https:'>https://</option>
                      <option value='http:'>http://</option>
                    </select>
                    <Input
                      value={buildHostname}
                      onChange={(e) => setBuildHostname(e.target.value)}
                      placeholder='example.com'
                      className='font-mono text-sm flex-1'
                    />
                    <Input
                      value={buildPort}
                      onChange={(e) => setBuildPort(e.target.value)}
                      placeholder='Port (optional)'
                      className='font-mono text-sm sm:w-36'
                      type='number'
                      min={1}
                      max={65535}
                    />
                  </div>

                  {/* Pathname */}
                  <div>
                    <label className='block text-xs text-muted-foreground mb-1.5'>Path</label>
                    <Input
                      value={buildPathname}
                      onChange={(e) => setBuildPathname(e.target.value)}
                      placeholder='/api/v1/users'
                      className='font-mono text-sm'
                    />
                  </div>

                  {/* Hash */}
                  <div>
                    <label className='block text-xs text-muted-foreground mb-1.5'>Hash / Fragment</label>
                    <Input
                      value={buildHash}
                      onChange={(e) => setBuildHash(e.target.value)}
                      placeholder='section-id (no # needed)'
                      className='font-mono text-sm'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Build params */}
              <Card>
                <CardContent className='pt-5 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium text-gray-300'>Query Parameters</p>
                    <Button variant='outline' size='sm' onClick={addBuildParam}>
                      <Plus className='w-3.5 h-3.5 mr-1' />Add
                    </Button>
                  </div>
                  {buildParams.map((p) => (
                    <div key={p.id} className='flex items-center gap-2'>
                      <Input
                        value={p.key}
                        onChange={(e) => handleBuildParamChange(p.id, 'key', e.target.value)}
                        placeholder='key'
                        className='font-mono text-sm flex-1'
                      />
                      <span className='text-muted-foreground'>=</span>
                      <Input
                        value={p.value}
                        onChange={(e) => handleBuildParamChange(p.id, 'value', e.target.value)}
                        placeholder='value'
                        className='font-mono text-sm flex-1'
                      />
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => removeBuildParam(p.id)}
                        className='flex-shrink-0'
                      >
                        <Trash2 className='w-4 h-4 text-muted-foreground' />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Assembled URL output */}
              <Card>
                <CardContent className='pt-5 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium text-gray-300'>Assembled URL</p>
                    <Button variant='outline' size='sm' onClick={copyBuild} disabled={!builtURL}>
                      {copiedBuild ? (
                        <><Check className='w-4 h-4 mr-1.5' />Copied</>
                      ) : (
                        <><Copy className='w-4 h-4 mr-1.5' />Copy</>
                      )}
                    </Button>
                  </div>
                  {builtURL ? (
                    <div className='bg-[#0d0d0d] rounded-md p-3'>
                      <p className='font-mono text-sm text-green-300 break-all'>{builtURL}</p>
                    </div>
                  ) : (
                    <p className='text-xs text-muted-foreground'>Enter a hostname to start building the URL.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
