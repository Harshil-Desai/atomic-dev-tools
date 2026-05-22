'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Type, AlertCircle } from 'lucide-react';

type EscapeType = 'url' | 'html' | 'javascript' | 'json' | 'base64' | 'unicode';

const HTML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };
const HTML_ENTITIES_REVERSE: Record<string, string> = Object.fromEntries(Object.entries(HTML_ENTITIES).map(([k, v]) => [v, k]));

export default function TextEscapePage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [escapeType, setEscapeType] = useState<EscapeType>('url');
  const [error, setError] = useState<string | null>(null);

  const ops: Record<EscapeType, { escape: (t: string) => string; unescape: (t: string) => string }> = {
    url: { escape: encodeURIComponent, unescape: (t) => { try { return decodeURIComponent(t); } catch { throw new Error('Invalid URL encoding'); } } },
    html: {
      escape: (t) => t.split('').map((c) => HTML_ENTITIES[c] || c).join(''),
      unescape: (t) => { let r = t; Object.entries(HTML_ENTITIES_REVERSE).forEach(([e, c]) => { r = r.replace(new RegExp(e, 'g'), c); }); r = r.replace(/&#x([0-9A-Fa-f]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16))); r = r.replace(/&#([0-9]+);/g, (_, c) => String.fromCharCode(parseInt(c, 10))); return r; },
    },
    javascript: {
      escape: (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'),
      unescape: (t) => t.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
    },
    json: {
      escape: (t) => JSON.stringify(t),
      unescape: (t) => { try { return JSON.parse(t); } catch { throw new Error('Invalid JSON string'); } },
    },
    base64: {
      escape: (t) => { try { return btoa(unescape(encodeURIComponent(t))); } catch { throw new Error('Failed to encode to Base64'); } },
      unescape: (t) => { try { return decodeURIComponent(escape(atob(t))); } catch { throw new Error('Invalid Base64 string'); } },
    },
    unicode: {
      escape: (t) => t.split('').map((c) => c.charCodeAt(0) > 127 ? '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0') : c).join(''),
      unescape: (t) => t.replace(/\\u([0-9A-Fa-f]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16))),
    },
  };

  const run = (fn: (t: string) => string) => {
    setError(null);
    try {
      const result = fn(input);
      setOutput(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setOutput('');
    }
  };

  return (
    <BpToolStage cat='text'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Text Escape/Unescape</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Encode or decode text in various formats instantly</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          <BpPanel title='Configuration'>
            <div className='flex flex-wrap items-end gap-3'>
              <div className='flex-1 min-w-40'>
                <label className='block text-xs text-gray-500 mb-1'>Escape Type</label>
                <select className='bp-input w-full' value={escapeType} onChange={(e) => setEscapeType(e.target.value as EscapeType)}>
                  <option value='url'>URL Encoding</option>
                  <option value='html'>HTML Entities</option>
                  <option value='javascript'>JavaScript Strings</option>
                  <option value='json'>JSON Strings</option>
                  <option value='base64'>Base64</option>
                  <option value='unicode'>Unicode Escape</option>
                </select>
              </div>
              <div className='flex gap-2'>
                <button className='bp-btn bp-btn-solid' onClick={() => run(ops[escapeType].escape)} disabled={!input.trim()} type='button'>ESCAPE</button>
                <button className='bp-btn' onClick={() => run(ops[escapeType].unescape)} disabled={!input.trim()} type='button'>UNESCAPE</button>
              </div>
            </div>
          </BpPanel>

          <div className='bp-layout-2col'>
            <BpPanel title='Input Text' meta={`${input.length} chars`}>
              <textarea className='bp-textarea font-mono text-sm' placeholder='Enter text to escape or unescape...' value={input} onChange={(e) => setInput(e.target.value)} rows={10} />
            </BpPanel>

            <BpPanel title='Output Text' meta={`${output.length} chars`}>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={output} label='COPY' />
              </div>
              <textarea className='bp-textarea font-mono text-sm' placeholder='Result will appear here...' value={output} readOnly rows={10} />
            </BpPanel>
          </div>

          {error && (
            <div className='flex items-start gap-3 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
              <p className='text-sm text-red-300'>{error}</p>
            </div>
          )}

          {!input.trim() && !error && (
            <div className='text-center text-gray-600 py-12'>
              <Type className='w-12 h-12 mx-auto mb-4 opacity-40' />
              <p className='text-sm'>Enter text and choose an operation to get started</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
