'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpStatus } from '@/components/blueprint';
import { Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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
        Object.assign(headers, JSON.parse(customHeaders));
      } catch {
        customHeaders.split('\n').forEach((line) => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) headers[key.trim()] = valueParts.join(':').trim();
        });
      }
    }
    return headers;
  };

  const explainCorsHeaders = (headers: CorsHeaders, status: number, method: string): string[] => {
    const explanations: string[] = [];
    if (status === 0 || status >= 500) {
      explanations.push('Request failed or server error. CORS check cannot be completed.');
      return explanations;
    }
    const origin = headers['Access-Control-Allow-Origin'];
    const methods = headers['Access-Control-Allow-Methods'];
    const allowHeaders = headers['Access-Control-Allow-Headers'];
    const credentials = headers['Access-Control-Allow-Credentials'];
    const maxAge = headers['Access-Control-Max-Age'];
    if (!origin) {
      explanations.push('No Access-Control-Allow-Origin header found. Cross-origin requests will be blocked.');
    } else if (origin === '*') {
      explanations.push('Access-Control-Allow-Origin: * allows all origins');
      if (credentials === 'true') explanations.push('Warning: Credentials cannot be used with wildcard origin.');
    } else {
      explanations.push(`Access-Control-Allow-Origin: ${origin} allows requests from this origin`);
    }
    if (methods) {
      const allowedMethods = methods.split(',').map((m) => m.trim());
      if (allowedMethods.includes(method) || allowedMethods.includes('*')) {
        explanations.push(`Method ${method} is allowed: ${methods}`);
      } else {
        explanations.push(`Method ${method} is not in allowed list: ${methods}`);
      }
    } else if (method !== 'OPTIONS') {
      explanations.push('No Access-Control-Allow-Methods header found in preflight response');
    }
    if (allowHeaders) explanations.push(`Allowed headers: ${allowHeaders}`);
    if (credentials === 'true') explanations.push('Credentials are allowed (cookies, authorization headers)');
    else if (credentials === 'false') explanations.push('Credentials are explicitly disabled');
    if (maxAge) explanations.push(`Preflight cache duration: ${maxAge} seconds`);
    return explanations;
  };

  const normalizeCorsHeaders = (response: Response): CorsHeaders => {
    const corsHeaders: CorsHeaders = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('access-control-')) {
        const normalizedKey = key.split('-').map((part, idx) => idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('-') as keyof CorsHeaders;
        corsHeaders[normalizedKey] = value;
      }
    });
    return corsHeaders;
  };

  const checkCors = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const headers = parseHeaders();
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
        const corsHeaders = normalizeCorsHeaders(preflightResponse);
        setResult({ success: preflightResponse.ok && corsHeaders['Access-Control-Allow-Origin'] !== undefined, status: preflightResponse.status, headers: corsHeaders, method: 'OPTIONS (Preflight)', explanation: explainCorsHeaders(corsHeaders, preflightResponse.status, method) });
      } catch (preflightError) {
        clearTimeout(preflightTimeout);
        if (preflightError instanceof Error && preflightError.name === 'AbortError') {
          setError('Preflight request timed out after 10 seconds');
        } else {
          try {
            const actualController = new AbortController();
            const actualTimeout = setTimeout(() => actualController.abort(), 10000);
            const actualResponse = await fetch(url, { method, headers, signal: actualController.signal });
            clearTimeout(actualTimeout);
            const corsHeaders = normalizeCorsHeaders(actualResponse);
            setResult({ success: actualResponse.ok && corsHeaders['Access-Control-Allow-Origin'] !== undefined, status: actualResponse.status, headers: corsHeaders, method, explanation: explainCorsHeaders(corsHeaders, actualResponse.status, method) });
          } catch (actualError) {
            setError(actualError instanceof Error ? `Network error: ${actualError.message}` : 'Unknown error occurred');
          }
        }
      }
    } catch (e) {
      setError(`Failed to check CORS: ${e instanceof Error ? e.message : 'An error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BpToolStage cat='api'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>CORS Preflight Checker</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Test CORS configuration and check if requests are allowed</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Request'>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>URL</label>
                <input className='bp-input w-full' placeholder='https://api.example.com/endpoint' value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>HTTP Method</label>
                <select className='bp-input w-full' value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)}>
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option><option>OPTIONS</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Custom Headers (JSON or key:value)</label>
                <textarea className='bp-textarea font-mono text-xs' placeholder={'{\n  "Authorization": "Bearer token"\n}'} value={customHeaders} onChange={(e) => setCustomHeaders(e.target.value)} rows={4} />
              </div>
              <button className='bp-btn bp-btn-solid w-full' onClick={checkCors} disabled={loading || !url.trim()} type='button'>
                <Shield className='w-4 h-4 mr-2 inline' />
                {loading ? 'CHECKING…' : 'CHECK CORS'}
              </button>
            </div>
          </BpPanel>

          {error && (
            <div className='flex items-start gap-3 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
              <pre className='text-sm text-red-300 whitespace-pre-wrap font-mono'>{error}</pre>
            </div>
          )}

          {result && (
            <>
              <BpPanel title='Result' meta={`HTTP ${result.status}`}>
                <div className='flex items-center gap-3 mb-3'>
                  {result.success ? <CheckCircle className='w-5 h-5 text-green-400' /> : <XCircle className='w-5 h-5 text-red-400' />}
                  <BpStatus state={result.success ? 'ok' : 'fail'}>{result.success ? 'CORS ALLOWED' : 'CORS BLOCKED'}</BpStatus>
                  <span className='text-xs text-gray-500'>{result.method}</span>
                </div>
              </BpPanel>

              <BpPanel title='CORS Headers'>
                {Object.entries(result.headers).length === 0 ? (
                  <p className='text-sm text-gray-500'>No CORS headers found</p>
                ) : (
                  <table className='bp-kv-table w-full'>
                    <tbody>
                      {Object.entries(result.headers).map(([key, value]) => (
                        <tr key={key}>
                          <td className='bp-kv-k font-mono text-xs'>{key}</td>
                          <td className='bp-kv-v font-mono text-xs'>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </BpPanel>

              <BpPanel title='Explanation'>
                <ul className='space-y-1'>
                  {result.explanation.map((exp, idx) => (
                    <li key={idx} className='text-sm text-gray-300'>{exp}</li>
                  ))}
                </ul>
              </BpPanel>
            </>
          )}

          {!result && !error && !loading && (
            <div className='text-center text-gray-600 py-12'>
              <Shield className='w-12 h-12 mx-auto mb-4 opacity-40' />
              <p className='text-sm'>Enter a URL and click Check CORS to test configuration</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
