'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

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

export default function URLParserPage() {
  const [tab, setTab] = useState<Tab>('parse');

  const [parseInput, setParseInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedURL | null>(null);
  const [parseParams, setParseParams] = useState<QueryParam[]>([makeParam()]);

  const [buildProtocol, setBuildProtocol] = useState('https:');
  const [buildHostname, setBuildHostname] = useState('');
  const [buildPort, setBuildPort] = useState('');
  const [buildPathname, setBuildPathname] = useState('/');
  const [buildHash, setBuildHash] = useState('');
  const [buildParams, setBuildParams] = useState<QueryParam[]>([makeParam()]);
  const [builtURL, setBuiltURL] = useState('');

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
      } catch {}
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

  const rows: { label: string; value: string }[] = parsedData ? [
    { label: 'Protocol', value: parsedData.protocol },
    { label: 'Origin', value: parsedData.origin },
    { label: 'Hostname', value: parsedData.hostname },
    { label: 'Port', value: parsedData.port || '(default)' },
    { label: 'Pathname', value: parsedData.pathname },
    { label: 'Search', value: parsedData.search || '(none)' },
    { label: 'Hash', value: parsedData.hash || '(none)' },
  ] : [];

  return (
    <BpToolStage cat='api'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-2 mb-1'>
          <Link className='w-5 h-5 text-gray-400' />
          <h1 className='text-xl sm:text-2xl font-semibold text-white'>URL Parser & Builder</h1>
        </div>
        <p className='text-xs sm:text-sm text-gray-400'>Break down URLs into their components and rebuild them from scratch</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Tab switcher */}
          <div className='flex gap-1 p-1 rounded-lg bg-[#1a1a1a] border border-[hsla(0,0%,20%,1)] w-fit'>
            {(['parse', 'build'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${tab === t ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {t === 'parse' ? 'Parse' : 'Build'}
              </button>
            ))}
          </div>

          {/* PARSE TAB */}
          {tab === 'parse' && (
            <>
              <BpPanel title='Full URL'>
                <div className='flex gap-2'>
                  <input
                    className='bp-input flex-1 font-mono text-sm'
                    value={parseInput}
                    onChange={(e) => handleParseInputChange(e.target.value)}
                    placeholder='https://example.com/path?foo=bar&baz=1#section'
                  />
                  <BpCopyBtn text={parseInput.trim()} label='COPY' />
                </div>
              </BpPanel>

              {parseError && (
                <div className='flex items-start gap-3 p-3 rounded border border-red-500/40 bg-red-950/20'>
                  <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                  <p className='text-sm text-red-300'>{parseError}</p>
                </div>
              )}

              {parsedData && (
                <>
                  <BpPanel title='URL Components'>
                    <table className='bp-kv-table w-full'>
                      <tbody>
                        {rows.map(({ label, value }) => (
                          <tr key={label}>
                            <td className='bp-kv-k'>{label}</td>
                            <td className='bp-kv-v font-mono'>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </BpPanel>

                  <BpPanel title='Query Parameters'>
                    <div className='bp-panel-actions mb-3'>
                      <button className='bp-btn' onClick={addParseParam} type='button'>
                        <Plus className='w-3.5 h-3.5 mr-1 inline' />ADD
                      </button>
                    </div>
                    <div className='space-y-2'>
                      {parseParams.map((p) => (
                        <div key={p.id} className='flex items-center gap-2'>
                          <input className='bp-input flex-1 font-mono text-sm' value={p.key}
                            onChange={(e) => handleParseParamChange(p.id, 'key', e.target.value)} placeholder='key' />
                          <span className='text-gray-500'>=</span>
                          <input className='bp-input flex-1 font-mono text-sm' value={p.value}
                            onChange={(e) => handleParseParamChange(p.id, 'value', e.target.value)} placeholder='value' />
                          <button className='bp-btn' onClick={() => removeParseParam(p.id)} type='button'>
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className='text-xs text-gray-600 mt-2'>Editing params rebuilds the URL above in real time.</p>
                  </BpPanel>
                </>
              )}

              {!parseInput && (
                <div className='text-center text-gray-600 py-12'>
                  <Link className='w-10 h-10 mx-auto mb-3 opacity-40' />
                  <p className='text-sm'>Paste a URL above to inspect its parts</p>
                </div>
              )}
            </>
          )}

          {/* BUILD TAB */}
          {tab === 'build' && (
            <>
              <BpPanel title='URL Parts'>
                <div className='space-y-3'>
                  <div className='flex flex-col sm:flex-row gap-2'>
                    <select
                      value={buildProtocol}
                      onChange={(e) => setBuildProtocol(e.target.value)}
                      className='bp-input sm:w-32'
                    >
                      <option value='https:'>https://</option>
                      <option value='http:'>http://</option>
                    </select>
                    <input className='bp-input flex-1 font-mono text-sm' value={buildHostname}
                      onChange={(e) => setBuildHostname(e.target.value)} placeholder='example.com' />
                    <input className='bp-input font-mono text-sm sm:w-36' value={buildPort}
                      onChange={(e) => setBuildPort(e.target.value)} placeholder='Port (optional)' type='number' min={1} max={65535} />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Path</label>
                    <input className='bp-input w-full font-mono text-sm' value={buildPathname}
                      onChange={(e) => setBuildPathname(e.target.value)} placeholder='/api/v1/users' />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 mb-1'>Hash / Fragment</label>
                    <input className='bp-input w-full font-mono text-sm' value={buildHash}
                      onChange={(e) => setBuildHash(e.target.value)} placeholder='section-id (no # needed)' />
                  </div>
                </div>
              </BpPanel>

              <BpPanel title='Query Parameters'>
                <div className='bp-panel-actions mb-3'>
                  <button className='bp-btn' onClick={addBuildParam} type='button'>
                    <Plus className='w-3.5 h-3.5 mr-1 inline' />ADD
                  </button>
                </div>
                <div className='space-y-2'>
                  {buildParams.map((p) => (
                    <div key={p.id} className='flex items-center gap-2'>
                      <input className='bp-input flex-1 font-mono text-sm' value={p.key}
                        onChange={(e) => handleBuildParamChange(p.id, 'key', e.target.value)} placeholder='key' />
                      <span className='text-gray-500'>=</span>
                      <input className='bp-input flex-1 font-mono text-sm' value={p.value}
                        onChange={(e) => handleBuildParamChange(p.id, 'value', e.target.value)} placeholder='value' />
                      <button className='bp-btn' onClick={() => removeBuildParam(p.id)} type='button'>
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  ))}
                </div>
              </BpPanel>

              <BpPanel title='Assembled URL'>
                <div className='bp-panel-actions mb-3'>
                  <BpCopyBtn text={builtURL} label='COPY' />
                </div>
                {builtURL ? (
                  <div className='bp-code-view'>
                    <pre className='bp-code-pre text-green-300'>{builtURL}</pre>
                  </div>
                ) : (
                  <p className='text-xs text-gray-600'>Enter a hostname to start building the URL.</p>
                )}
              </BpPanel>
            </>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
