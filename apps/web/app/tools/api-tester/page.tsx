'use client';

import { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { BpPanel, BpToolStage, BpCopyBtn } from '@/components/blueprint';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers: string;
  body: string;
  timeout: number;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  timestamp: number;
  config: RequestConfig;
}

interface HistoryEntry {
  id: number;
  response: ResponseData | null;
  error: string | null;
  timestamp: number;
  config: RequestConfig;
}

export default function ApiTesterPage() {
  const [config, setConfig] = useState<RequestConfig>({
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: '{\n  "Content-Type": "application/json"\n}',
    body: '',
    timeout: 30,
  });

  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number | null>(null);

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setActiveHistoryIndex(null);

    const requestStartTime = Date.now();
    let requestError: string | null = null;
    let requestResponse: ResponseData | null = null;

    try {
      let headers: Record<string, string> = {};
      if (config.headers.trim()) {
        try {
          headers = JSON.parse(config.headers);
        } catch {
          throw new Error('Invalid JSON in headers field');
        }
      }

      let body: string | undefined;
      if (config.method !== 'GET' && config.body.trim()) {
        body = config.body;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, config.timeout * 1000);

      const startTime = performance.now();
      const res = await fetch(config.url, { method: config.method, headers, body, signal: controller.signal });
      clearTimeout(timeoutId);

      const responseTime = Math.round(performance.now() - startTime);
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => { responseHeaders[key] = value; });

      const contentType = res.headers.get('content-type');
      let responseBody: string;
      if (contentType?.includes('application/json')) {
        const json = await res.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await res.text();
      }

      requestResponse = { status: res.status, statusText: res.statusText, headers: responseHeaders, body: responseBody, time: responseTime, timestamp: requestStartTime, config: { ...config } };
      setResponse(requestResponse);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An error occurred';
      requestError = msg.includes('aborted') ? `Request timed out after ${config.timeout}s.` : msg.includes('Failed to fetch') ? 'Network request failed (CORS or invalid URL).' : msg;
      setError(requestError);
    } finally {
      setLoading(false);
      setHistory((prev) => [{ id: Date.now(), response: requestResponse, error: requestError, timestamp: requestStartTime, config: { ...config } }, ...prev].slice(0, 5));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendRequest();
  };

  const viewHistoryEntry = (index: number) => {
    setActiveHistoryIndex(index);
    const entry = history[index];
    if (entry.response) { setResponse(entry.response); setError(null); }
    else if (entry.error) { setError(entry.error); setResponse(null); }
  };

  const statusClass = (s: number) =>
    s >= 200 && s < 300 ? 'bp-status-ok' : s >= 400 ? 'bp-status-fail' : 'bp-status-warn';

  return (
    <BpToolStage cat='api'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-1'>API Tester</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Test HTTP endpoints — press Ctrl+Enter to send</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto flex flex-col lg:flex-row gap-4'>
          {/* Request */}
          <div className='space-y-3 lg:w-96 shrink-0'>
            <BpPanel title='REQUEST'>
              <div className='space-y-3'>
                <div>
                  <label className='block text-xs text-gray-500 mb-1 uppercase font-mono tracking-wider'>Method & URL</label>
                  <div className='flex gap-2'>
                    <select
                      value={config.method}
                      onChange={(e) => setConfig({ ...config, method: e.target.value as HttpMethod })}
                      className='bp-input w-24 shrink-0'
                      style={{ resize: 'none' }}
                    >
                      <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
                    </select>
                    <input
                      className='bp-input flex-1'
                      placeholder='https://api.example.com/endpoint'
                      value={config.url}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-xs text-gray-500 mb-1 uppercase font-mono tracking-wider'>Headers (JSON)</label>
                  <textarea
                    className='bp-textarea'
                    rows={5}
                    value={config.headers}
                    onChange={(e) => setConfig({ ...config, headers: e.target.value })}
                    placeholder='{ "Authorization": "Bearer ..." }'
                  />
                </div>
                <div>
                  <label className='block text-xs text-gray-500 mb-1 uppercase font-mono tracking-wider'>Timeout (s)</label>
                  <input type='number' className='bp-input w-24' min={1} max={300} value={config.timeout}
                    onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 30 })} />
                </div>
                {config.method !== 'GET' && (
                  <div>
                    <label className='block text-xs text-gray-500 mb-1 uppercase font-mono tracking-wider'>Body</label>
                    <textarea className='bp-textarea' rows={6} value={config.body}
                      onChange={(e) => setConfig({ ...config, body: e.target.value })}
                      placeholder='{ "key": "value" }' />
                  </div>
                )}
                <button
                  className='bp-btn bp-btn-solid w-full justify-center'
                  onClick={sendRequest}
                  disabled={loading || !config.url.trim()}
                >
                  <Send className='w-3 h-3' />
                  {loading ? 'SENDING…' : 'SEND REQUEST'}
                </button>
              </div>
            </BpPanel>
          </div>

          {/* Response */}
          <div className='space-y-3 flex-1 min-w-0'>
            {history.length > 0 && (
              <BpPanel title='HISTORY'>
                <div className='flex flex-wrap gap-2'>
                  {history.map((entry, index) => (
                    <button key={entry.id} onClick={() => viewHistoryEntry(index)}
                      className={`bp-chip ${activeHistoryIndex === index ? '' : ''}`}
                      data-active={activeHistoryIndex === index ? 'true' : 'false'}>
                      {entry.config.method} {entry.config.url.substring(0, 25)}
                    </button>
                  ))}
                  <button className='bp-btn' onClick={() => { setHistory([]); setActiveHistoryIndex(null); setResponse(null); setError(null); }}>CLEAR</button>
                </div>
              </BpPanel>
            )}

            {error && (
              <BpPanel title='ERROR'>
                <div className='flex items-start gap-2 text-red-400'>
                  <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
                  <pre className='text-xs font-mono whitespace-pre-wrap'>{error}</pre>
                </div>
              </BpPanel>
            )}

            {response && (
              <>
                <BpPanel title='STATUS' meta={`${response.time}ms`}>
                  <div className='flex items-center gap-3'>
                    <span className={`bp-status ${statusClass(response.status)}`}>{response.status} {response.statusText}</span>
                  </div>
                </BpPanel>
                <BpPanel title='RESPONSE HEADERS'>
                  <div className='max-h-40 overflow-auto'>
                    <pre className='text-xs font-mono text-gray-400'>{JSON.stringify(response.headers, null, 2)}</pre>
                  </div>
                </BpPanel>
                <BpPanel title='RESPONSE BODY'>
                  <div className='flex justify-end mb-2'>
                    <BpCopyBtn text={response.body} />
                  </div>
                  <div className='max-h-96 overflow-auto'>
                    <pre className='text-xs font-mono text-gray-300 whitespace-pre-wrap'>{response.body}</pre>
                  </div>
                </BpPanel>
              </>
            )}

            {!response && !error && !loading && (
              <BpPanel title='RESPONSE'>
                <div className='text-center py-12 text-gray-600'>
                  <Send className='w-10 h-10 mx-auto mb-3 opacity-30' />
                  <p className='text-sm font-mono'>Send a request to see the response</p>
                </div>
              </BpPanel>
            )}
          </div>
        </div>
      </div>
    </BpToolStage>
  );
}
