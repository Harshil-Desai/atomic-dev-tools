'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileJson, AlertCircle, CheckCircle, Trash2, Minimize2 } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn, BpStatus } from '@/components/blueprint';

type ValidationStatus = 'idle' | 'valid' | 'invalid';

export default function JsonFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentSize, setIndentSize] = useState<2 | 4>(2);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateJson = useCallback((text: string): { valid: boolean; error: string | null } => {
    if (!text.trim()) return { valid: false, error: null };
    try { JSON.parse(text); return { valid: true, error: null }; }
    catch (e) { return { valid: false, error: e instanceof Error ? e.message : 'Invalid JSON' }; }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) { setValidationStatus('idle'); setValidationError(null); return; }
    debounceRef.current = setTimeout(() => {
      const { valid, error } = validateJson(input);
      setValidationStatus(valid ? 'valid' : 'invalid');
      setValidationError(error);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, validateJson]);

  const handleFormat = () => {
    const { valid, error } = validateJson(input);
    if (!valid) { setValidationStatus('invalid'); setValidationError(error); setOutput(''); return; }
    try { setOutput(JSON.stringify(JSON.parse(input), null, indentSize)); setValidationStatus('valid'); setValidationError(null); } catch { setOutput(''); }
  };

  const handleMinify = () => {
    const { valid, error } = validateJson(input);
    if (!valid) { setValidationStatus('invalid'); setValidationError(error); setOutput(''); return; }
    try { setOutput(JSON.stringify(JSON.parse(input))); setValidationStatus('valid'); setValidationError(null); } catch { setOutput(''); }
  };

  const handleValidateOnly = () => {
    const { valid, error } = validateJson(input);
    setValidationStatus(valid ? 'valid' : 'invalid');
    setValidationError(error);
    setOutput('');
  };

  const handleClear = () => { setInput(''); setOutput(''); setValidationStatus('idle'); setValidationError(null); };

  const charCount = input.length;
  const lineCount = input ? input.split('\n').length : 0;
  const errorLineMatch = validationError?.match(/line (\d+)/i);
  const errorLine = errorLineMatch ? errorLineMatch[1] : null;

  return (
    <BpToolStage cat='data'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-3 mb-1'>
          <FileJson className='w-5 h-5 text-gray-400' />
          <h1 className='text-xl sm:text-2xl font-semibold text-white'>JSON Formatter & Validator</h1>
        </div>
        <p className='text-xs sm:text-sm text-gray-400'>Format, minify, and validate JSON with error highlighting</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          <BpPanel title='JSON Input' meta={`${charCount.toLocaleString()} chars · ${lineCount.toLocaleString()} lines`}>
            <div className='flex flex-wrap items-center gap-2 mb-3'>
              {validationStatus === 'valid' && <BpStatus state='ok'>VALID JSON</BpStatus>}
              {validationStatus === 'invalid' && <BpStatus state='fail'>INVALID{errorLine ? ` (line ${errorLine})` : ''}</BpStatus>}
              <button className='bp-btn ml-auto' onClick={handleClear} type='button'>
                <Trash2 className='w-3.5 h-3.5 mr-1 inline' />CLEAR
              </button>
            </div>
            <textarea className='bp-textarea font-mono text-sm' placeholder='Paste your JSON here...' value={input} onChange={(e) => setInput(e.target.value)} rows={14} />
            {validationStatus === 'invalid' && validationError && (
              <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900 p-2.5 rounded-md mt-2'>
                <AlertCircle className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' />
                <span className='font-mono'>{validationError}</span>
              </div>
            )}
          </BpPanel>

          <BpPanel title='Actions'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='flex items-center gap-2'>
                <label className='text-xs text-gray-500'>Indent:</label>
                <select className='bp-input h-8 px-2 text-xs' value={indentSize} onChange={(e) => setIndentSize(parseInt(e.target.value) as 2 | 4)}>
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                </select>
              </div>
              <div className='flex flex-wrap gap-2 ml-auto'>
                <button className='bp-btn' onClick={handleValidateOnly} disabled={!input.trim()} type='button'>
                  <CheckCircle className='w-3.5 h-3.5 mr-1 inline' />VALIDATE
                </button>
                <button className='bp-btn' onClick={handleMinify} disabled={!input.trim()} type='button'>
                  <Minimize2 className='w-3.5 h-3.5 mr-1 inline' />MINIFY
                </button>
                <button className='bp-btn bp-btn-solid' onClick={handleFormat} disabled={!input.trim()} type='button'>
                  <FileJson className='w-3.5 h-3.5 mr-1 inline' />FORMAT
                </button>
              </div>
            </div>
          </BpPanel>

          {output && (
            <BpPanel title='Output' meta={`${output.length.toLocaleString()} chars · ${output.split('\n').length.toLocaleString()} lines`}>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={output} label='COPY' />
              </div>
              <textarea className='bp-textarea font-mono text-sm' value={output} readOnly rows={14} />
            </BpPanel>
          )}

          {!output && !input.trim() && (
            <div className='text-center text-gray-600 py-12'>
              <FileJson className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='text-sm'>Paste JSON above and click Format, Minify, or Validate</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
