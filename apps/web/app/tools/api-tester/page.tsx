'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { Send, AlertCircle, Globe } from 'lucide-react';

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
      // Parse headers
      let headers: Record<string, string> = {};
      if (config.headers.trim()) {
        try {
          headers = JSON.parse(config.headers);
        } catch (e) {
          throw new Error('Invalid JSON in headers field');
        }
      }

      // Parse body for non-GET requests
      let body: string | undefined;
      if (config.method !== 'GET' && config.body.trim()) {
        body = config.body;
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, config.timeout * 1000);

      const startTime = performance.now();
      const res = await fetch(config.url, {
        method: config.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body
      const contentType = res.headers.get('content-type');
      let responseBody: string;

      if (contentType?.includes('application/json')) {
        const json = await res.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await res.text();
      }

      requestResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        time: responseTime,
        timestamp: requestStartTime,
        config: { ...config },
      };

      setResponse(requestResponse);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred';
      if (errorMessage === 'AbortError' || errorMessage.includes('aborted')) {
        requestError =
          `Request timed out after ${config.timeout} seconds.\n\n` +
          '• The server took too long to respond\n' +
          '• Network connection is slow\n' +
          '• Try increasing the timeout value';
        setError(requestError);
      } else if (errorMessage.includes('Failed to fetch')) {
        requestError =
          'Network request failed. This could be due to:\n\n' +
          "• CORS restrictions (the API doesn't allow browser requests)\n" +
          '• Invalid URL\n' +
          '• Network connectivity issues\n\n' +
          'Tip: Use a CORS proxy or test with APIs that support CORS.';
        setError(requestError);
      } else {
        requestError = errorMessage;
        setError(requestError);
      }
    } finally {
      setLoading(false);

      // Add to history
      const newHistoryEntry: HistoryEntry = {
        id: Date.now(),
        response: requestResponse,
        error: requestError,
        timestamp: requestStartTime,
        config: { ...config },
      };

      setHistory((prev) => {
        const updated = [newHistoryEntry, ...prev];
        // Keep only last 5
        return updated.slice(0, 5);
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      sendRequest();
    }
  };

  const viewHistoryEntry = (index: number) => {
    setActiveHistoryIndex(index);
    const entry = history[index];
    if (entry.response) {
      setResponse(entry.response);
      setError(null);
    } else if (entry.error) {
      setError(entry.error);
      setResponse(null);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveHistoryIndex(null);
    setResponse(null);
    setError(null);
  };

  const getRequestLabel = (entry: HistoryEntry) => {
    const { method, url } = entry.config;
    return `${method} ${url.substring(0, 30)}${url.length > 30 ? '...' : ''}`;
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className="flex items-center gap-3 mb-2">
          <div>
            <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>API Tester</h1>
            <p className='text-xs sm:text-sm text-muted-foreground'>Test HTTP endpoints instantly. Press ⌘+Enter to send request.</p>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto flex flex-col md:flex-row gap-4 sm:gap-5 md:gap-6'>
          {/* Request Panel */}
          <div className='space-y-4'>
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div>
                  <label className='block text-xs sm:text-sm font-medium text-gray-300 mb-2'>Method & URL</label>
                  <div className='flex gap-2'>
                    <select
                      value={config.method}
                      onChange={(e) => setConfig({ ...config, method: e.target.value as HttpMethod })}
                      className='h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>PATCH</option>
                      <option>DELETE</option>
                    </select>
                    <Input
                      placeholder='https://api.example.com/endpoint'
                      value={config.url}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      onKeyDown={handleKeyDown}
                      className='flex-1'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Headers (JSON)</label>
                  <Textarea
                    placeholder='{
  "Authorization": "Bearer token"
}'
                    value={config.headers}
                    onChange={(e) => setConfig({ ...config, headers: e.target.value })}
                    rows={6}
                    className='font-mono text-xs'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Timeout (seconds)</label>
                  <Input
                    type='number'
                    min='1'
                    max='300'
                    value={config.timeout}
                    onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 30 })}
                    placeholder='30'
                    className='max-w-32'
                  />
                  <p className='text-xs text-gray-500 mt-1'>Default: 30 seconds</p>
                </div>
                {config.method !== 'GET' && (
                  <div>
                    <label className='block text-sm font-medium text-gray-300 mb-2'>Request Body</label>
                    <Textarea
                      placeholder='{
  "key": "value"
}'
                      value={config.body}
                      onChange={(e) => setConfig({ ...config, body: e.target.value })}
                      rows={8}
                      className='font-mono text-xs'
                    />
                  </div>
                )}
                <Button onClick={sendRequest} disabled={loading || !config.url.trim()} className='w-full' size='lg'>
                  <Send className='w-4 h-4 mr-2' />
                  {loading ? 'Sending...' : 'Send Request'}
                </Button>
              </CardContent>
            </Card>
          </div>
          {/* Response Panel */}
          <div className='space-y-4'>
            {history.length > 0 && (
              <Card>
                <CardContent className='pt-6'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-sm font-semibold text-gray-300'>Recent Requests ({history.length})</h3>
                    <Button onClick={clearHistory} variant='ghost' size='sm'>
                      Clear
                    </Button>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {history.map((entry, index) => {
                      const isActive = activeHistoryIndex === index;
                      const hasError = entry.error !== null;
                      return (
                        <button
                          key={entry.id}
                          onClick={() => viewHistoryEntry(index)}
                          className={`px-3 py-1 rounded-md text-xs font-mono transition relative group ${isActive
                            ? 'bg-blue-600 text-white'
                            : hasError
                              ? 'bg-red-950/30 text-red-300 border border-red-900'
                              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600'
                            }`}
                        >
                          {getRequestLabel(entry)}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            {error && (
              <Card className='border-red-900 bg-red-950/30'>
                <CardContent className='pt-6'>
                  <div className='flex items-start gap-3'>
                    <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                    <div>
                      <h3 className='font-semibold text-red-400 mb-2'>Request Failed</h3>
                      <pre className='text-sm text-red-300 whitespace-pre-wrap font-mono'>{error}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {response && (
              <>
                {/* Status */}
                <Card>
                  <CardContent className='pt-6'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${response.status >= 200 && response.status < 300
                            ? 'bg-green-900/50 text-green-400'
                            : response.status >= 400
                              ? 'bg-red-900/50 text-red-400'
                              : 'bg-yellow-900/50 text-yellow-400'
                            }`}
                        >
                          {response.status}
                        </span>
                        <span className='text-gray-400'>{response.statusText}</span>
                      </div>
                      <span className='text-sm text-gray-500'>{response.time}ms</span>
                    </div>
                  </CardContent>
                </Card>
                {/* Headers */}
                <Card>
                  <CardContent className='pt-6'>
                    <h3 className='text-sm font-semibold text-gray-300 mb-3'>Response Headers</h3>
                    <div className=' rounded-md p-3 max-h-48 overflow-auto'>
                      <pre className='text-xs text-gray-400 font-mono'>{JSON.stringify(response.headers, null, 2)}</pre>
                    </div>
                  </CardContent>
                </Card>
                {/* Body */}
                <Card>
                  <CardContent className='pt-6'>
                    <h3 className='text-sm font-semibold text-gray-300 mb-3'>Response Body</h3>
                    <div className=' rounded-md p-3 max-h-96 overflow-auto'>
                      <pre className='text-xs text-gray-300 font-mono whitespace-pre-wrap'>{response.body}</pre>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            {!response && !error && !loading && (
              <Card className='border-dashed'>
                <CardContent className='pt-6'>
                  <div className='text-center text-gray-500 py-12'>
                    <Send className='w-12 h-12 mx-auto mb-4 opacity-50' />
                    <p>Send a request to see the response</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
