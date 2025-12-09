'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@/ui';
import { Shield, Send, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

interface CorsHeaders {
  'Access-Control-Allow-Origin'?: string;
  'Access-Control-Allow-Methods'?: string;
  'Access-Control-Allow-Headers'?: string;
  'Access-Control-Allow-Credentials'?: string;
  'Access-Control-Max-Age'?: string;
}

interface CorsResult {
  success: boolean;
  status: number;
  headers: CorsHeaders;
  method: string;
  explanation: string[];
}

export default function CorsCheckerPage() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [customHeaders, setCustomHeaders] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (customHeaders.trim()) {
      try {
        const parsed = JSON.parse(customHeaders);
        Object.assign(headers, parsed);
      } catch (e) {
        // If not JSON, try parsing as simple format
        customHeaders.split('\n').forEach((line) => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            headers[key.trim()] = valueParts.join(':').trim();
          }
        });
      }
    }
    return headers;
  };

  const explainCorsHeaders = (headers: CorsHeaders, status: number, method: string): string[] => {
    const explanations: string[] = [];

    if (status === 0 || status >= 500) {
      explanations.push('⚠️ Request failed or server error. CORS check cannot be completed.');
      return explanations;
    }

    const origin = headers['Access-Control-Allow-Origin'];
    const methods = headers['Access-Control-Allow-Methods'];
    const allowHeaders = headers['Access-Control-Allow-Headers'];
    const credentials = headers['Access-Control-Allow-Credentials'];
    const maxAge = headers['Access-Control-Max-Age'];

    if (!origin) {
      explanations.push('❌ No Access-Control-Allow-Origin header found. Cross-origin requests will be blocked.');
    } else if (origin === '*') {
      explanations.push('✓ Access-Control-Allow-Origin: * allows all origins');
      if (credentials === 'true') {
        explanations.push('⚠️ Warning: Credentials cannot be used with wildcard origin.');
      }
    } else {
      explanations.push(`✓ Access-Control-Allow-Origin: ${origin} allows requests from this origin`);
    }

    if (methods) {
      const allowedMethods = methods.split(',').map((m) => m.trim());
      if (allowedMethods.includes(method) || allowedMethods.includes('*')) {
        explanations.push(`✓ Method ${method} is allowed: ${methods}`);
      } else {
        explanations.push(`❌ Method ${method} is not in allowed list: ${methods}`);
      }
    } else if (method !== 'OPTIONS') {
      explanations.push('⚠️ No Access-Control-Allow-Methods header found in preflight response');
    }

    if (allowHeaders) {
      explanations.push(`✓ Allowed headers: ${allowHeaders}`);
    }

    if (credentials === 'true') {
      explanations.push('✓ Credentials are allowed (cookies, authorization headers)');
    } else if (credentials === 'false') {
      explanations.push('⚠️ Credentials are explicitly disabled');
    }

    if (maxAge) {
      explanations.push(`✓ Preflight cache duration: ${maxAge} seconds`);
    }

    return explanations;
  };

  const checkCors = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Parse custom headers
      const headers = parseHeaders();

      // First, send OPTIONS preflight request
      const preflightController = new AbortController();
      const preflightTimeout = setTimeout(() => preflightController.abort(), 10000);

      try {
        const preflightResponse = await fetch(url, {
          method: 'OPTIONS',
          headers: {
            Origin: typeof window !== 'undefined' ? window.location.origin : 'https://example.com',
            'Access-Control-Request-Method': method,
            'Access-Control-Request-Headers': Object.keys(headers).join(', '),
            ...headers,
          },
          signal: preflightController.signal,
        });

        clearTimeout(preflightTimeout);

        const corsHeaders: CorsHeaders = {};
        preflightResponse.headers.forEach((value, key) => {
          if (key.toLowerCase().startsWith('access-control-')) {
            const normalizedKey = key
              .split('-')
              .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
              .join('-') as keyof CorsHeaders;
            corsHeaders[normalizedKey] = value;
          }
        });

        const explanations = explainCorsHeaders(corsHeaders, preflightResponse.status, method);

        setResult({
          success: preflightResponse.ok && corsHeaders['Access-Control-Allow-Origin'] !== undefined,
          status: preflightResponse.status,
          headers: corsHeaders,
          method: 'OPTIONS (Preflight)',
          explanation: explanations,
        });
      } catch (preflightError) {
        clearTimeout(preflightTimeout);

        if (preflightError instanceof Error && preflightError.name === 'AbortError') {
          setError('Preflight request timed out after 10 seconds');
        } else {
          // Preflight might fail due to CORS - try actual request
          try {
            const actualController = new AbortController();
            const actualTimeout = setTimeout(() => actualController.abort(), 10000);

            const actualResponse = await fetch(url, {
              method,
              headers,
              signal: actualController.signal,
            });

            clearTimeout(actualTimeout);

            const corsHeaders: CorsHeaders = {};
            actualResponse.headers.forEach((value, key) => {
              if (key.toLowerCase().startsWith('access-control-')) {
                const normalizedKey = key
                  .split('-')
                  .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
                  .join('-') as keyof CorsHeaders;
                corsHeaders[normalizedKey] = value;
              }
            });

            const explanations = explainCorsHeaders(corsHeaders, actualResponse.status, method);

            setResult({
              success: actualResponse.ok && corsHeaders['Access-Control-Allow-Origin'] !== undefined,
              status: actualResponse.status,
              headers: corsHeaders,
              method,
              explanation: explanations,
            });
          } catch (actualError) {
            if (actualError instanceof Error) {
              if (actualError.message.includes('CORS')) {
                setError(
                  '❌ CORS Error: The server blocked this request. This usually means:\n\n' +
                    '• No Access-Control-Allow-Origin header in response\n' +
                    '• Origin not in allow list\n' +
                    '• Server does not allow this HTTP method\n\n' +
                    'Note: Preflight (OPTIONS) request also failed.',
                );
              } else {
                setError(`Network error: ${actualError.message}`);
              }
            } else {
              setError('Unknown error occurred');
            }
          }
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred';
      setError(`Failed to check CORS: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>CORS Preflight Checker</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Test CORS configuration and check if requests are allowed</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-300 mb-2'>URL</label>
                <Input
                  placeholder='https://api.example.com/endpoint'
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className='w-full'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>HTTP Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                  <option>PATCH</option>
                  <option>OPTIONS</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Custom Headers (JSON or key:value format)
                </label>
                <Textarea
                  placeholder='{\n  "Authorization": "Bearer token"\n}'
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  rows={4}
                  className='font-mono text-xs'
                />
              </div>
              <Button onClick={checkCors} disabled={loading || !url.trim()} className='w-full' size='lg'>
                <Shield className='w-4 h-4 mr-2' />
                {loading ? 'Checking...' : 'Check CORS'}
              </Button>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className='border-red-900 bg-red-950/30'>
              <CardContent className='pt-6'>
                <div className='flex items-start gap-3'>
                  <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                  <div>
                    <h3 className='font-semibold text-red-400 mb-2'>Error</h3>
                    <pre className='text-sm text-red-300 whitespace-pre-wrap font-mono'>{error}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <>
              {/* Status */}
              <Card>
                <CardContent className='pt-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                      {result.success ? (
                        <CheckCircle className='w-6 h-6 text-green-400' />
                      ) : (
                        <XCircle className='w-6 h-6 text-red-400' />
                      )}
                      <div>
                        <h3 className='text-lg font-semibold text-gray-300'>
                          {result.success ? 'CORS Allowed' : 'CORS Blocked'}
                        </h3>
                        <p className='text-sm text-gray-500'>{result.method}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        result.status >= 200 && result.status < 300
                          ? 'bg-green-900/50 text-green-400'
                          : result.status >= 400
                          ? 'bg-red-900/50 text-red-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                      }`}
                    >
                      {result.status}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* CORS Headers */}
              <Card>
                <CardContent className='pt-6'>
                  <h3 className='text-sm font-semibold text-gray-300 mb-3'>CORS Headers</h3>
                  <div className='bg-gray-950 rounded-md p-3 space-y-2'>
                    {Object.entries(result.headers).length === 0 ? (
                      <p className='text-sm text-gray-500'>No CORS headers found</p>
                    ) : (
                      Object.entries(result.headers).map(([key, value]) => (
                        <div key={key} className='font-mono text-xs'>
                          <span className='text-gray-400'>{key}:</span>
                          <span className='text-gray-300 ml-2'>{value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Explanation */}
              <Card>
                <CardContent className='pt-6'>
                  <h3 className='text-sm font-semibold text-gray-300 mb-3'>Explanation</h3>
                  <div className='space-y-2'>
                    {result.explanation.map((explanation, idx) => (
                      <div key={idx} className='text-sm text-gray-300 whitespace-pre-wrap'>
                        {explanation}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!result && !error && !loading && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Shield className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Enter a URL and click "Check CORS" to test CORS configuration</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
