'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileJson, Copy, Check, AlertCircle, CheckCircle, Trash2, Minimize2 } from 'lucide-react';
import { Button, Card, CardContent, Textarea } from '@/ui';

type ValidationStatus = 'idle' | 'valid' | 'invalid';

export default function JsonFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentSize, setIndentSize] = useState<2 | 4>(2);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateJson = useCallback((text: string): { valid: boolean; error: string | null } => {
    if (!text.trim()) return { valid: false, error: null };
    try {
      JSON.parse(text);
      return { valid: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      return { valid: false, error: msg };
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setValidationStatus('idle');
      setValidationError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const { valid, error } = validateJson(input);
      setValidationStatus(valid ? 'valid' : 'invalid');
      setValidationError(error);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, validateJson]);

  const handleFormat = () => {
    const { valid, error } = validateJson(input);
    if (!valid) {
      setValidationStatus('invalid');
      setValidationError(error);
      setOutput('');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indentSize));
      setValidationStatus('valid');
      setValidationError(null);
    } catch (e) {
      setOutput('');
    }
  };

  const handleMinify = () => {
    const { valid, error } = validateJson(input);
    if (!valid) {
      setValidationStatus('invalid');
      setValidationError(error);
      setOutput('');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setValidationStatus('valid');
      setValidationError(null);
    } catch (e) {
      setOutput('');
    }
  };

  const handleValidateOnly = () => {
    const { valid, error } = validateJson(input);
    setValidationStatus(valid ? 'valid' : 'invalid');
    setValidationError(error);
    setOutput('');
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setValidationStatus('idle');
    setValidationError(null);
    setCopied(false);
  };

  const charCount = input.length;
  const lineCount = input ? input.split('\n').length : 0;

  const errorLineMatch = validationError?.match(/line (\d+)/i);
  const errorLine = errorLineMatch ? errorLineMatch[1] : null;

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className='flex items-center gap-3 mb-1'>
          <FileJson className='w-5 h-5 text-muted-foreground' />
          <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>JSON Formatter & Validator</h1>
        </div>
        <p className='text-xs sm:text-sm text-muted-foreground'>Format, minify, and validate JSON with error highlighting</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Input Card */}
          <Card>
            <CardContent className='pt-5 space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <label className='text-sm font-medium text-gray-300'>JSON Input</label>
                <div className='flex items-center gap-2'>
                  {/* Validation badge */}
                  {validationStatus === 'valid' && (
                    <span className='flex items-center gap-1 text-xs font-medium text-green-400 bg-green-950/50 border border-green-800 px-2 py-0.5 rounded-full'>
                      <CheckCircle className='w-3 h-3' />
                      Valid JSON
                    </span>
                  )}
                  {validationStatus === 'invalid' && (
                    <span className='flex items-center gap-1 text-xs font-medium text-red-400 bg-red-950/50 border border-red-800 px-2 py-0.5 rounded-full'>
                      <AlertCircle className='w-3 h-3' />
                      Invalid
                      {errorLine ? ` (line ${errorLine})` : ''}
                    </span>
                  )}
                  <Button onClick={handleClear} variant='outline' size='sm'>
                    <Trash2 className='w-3.5 h-3.5 mr-1' />
                    Clear
                  </Button>
                </div>
              </div>

              <Textarea
                placeholder='Paste your JSON here...'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={14}
                className='font-mono text-sm'
              />

              {validationStatus === 'invalid' && validationError && (
                <div className='flex items-start gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900 p-2.5 rounded-md'>
                  <AlertCircle className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' />
                  <span className='font-mono'>{validationError}</span>
                </div>
              )}

              <div className='flex items-center justify-between text-xs text-gray-500'>
                <span>{charCount.toLocaleString()} chars · {lineCount.toLocaleString()} lines</span>
              </div>
            </CardContent>
          </Card>

          {/* Controls Card */}
          <Card>
            <CardContent className='pt-5'>
              <div className='flex flex-wrap items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <label className='text-xs text-gray-400'>Indent:</label>
                  <select
                    value={indentSize}
                    onChange={(e) => setIndentSize(parseInt(e.target.value) as 2 | 4)}
                    className='h-8 px-2 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces</option>
                  </select>
                </div>
                <div className='flex flex-wrap gap-2 ml-auto'>
                  <Button onClick={handleValidateOnly} variant='outline' size='sm' disabled={!input.trim()}>
                    <CheckCircle className='w-3.5 h-3.5 mr-1.5' />
                    Validate Only
                  </Button>
                  <Button onClick={handleMinify} variant='outline' size='sm' disabled={!input.trim()}>
                    <Minimize2 className='w-3.5 h-3.5 mr-1.5' />
                    Minify
                  </Button>
                  <Button onClick={handleFormat} size='sm' disabled={!input.trim()}>
                    <FileJson className='w-3.5 h-3.5 mr-1.5' />
                    Format
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output Card */}
          {output && (
            <Card>
              <CardContent className='pt-5 space-y-3'>
                <div className='flex items-center justify-between'>
                  <label className='text-sm font-medium text-gray-300'>Output</label>
                  <Button onClick={handleCopy} variant='outline' size='sm'>
                    {copied ? (
                      <>
                        <Check className='w-3.5 h-3.5 mr-1.5' />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className='w-3.5 h-3.5 mr-1.5' />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={output}
                  readOnly
                  rows={14}
                  className='font-mono text-sm bg-gray-950'
                />
                <div className='text-xs text-gray-500 text-right'>
                  {output.length.toLocaleString()} chars · {output.split('\n').length.toLocaleString()} lines
                </div>
              </CardContent>
            </Card>
          )}

          {!output && !input.trim() && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-10'>
                  <FileJson className='w-10 h-10 mx-auto mb-3 opacity-40' />
                  <p className='text-sm'>Paste JSON above and click Format, Minify, or Validate</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
