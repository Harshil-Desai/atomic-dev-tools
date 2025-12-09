'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { Copy, Check, AlertCircle, ArrowUpDown } from 'lucide-react';

export default function Base64EncoderPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConvert = () => {
    setError(null);
    setCopied(false);

    if (!input.trim()) {
      setOutput('');
      return;
    }

    try {
      if (mode === 'encode') {
        // Encode to Base64
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setOutput(encoded);
      } else {
        // Decode from Base64
        try {
          const decoded = decodeURIComponent(escape(atob(input)));
          setOutput(decoded);
        } catch (e) {
          throw new Error('Invalid Base64 string. Please check your input.');
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred';
      setError(errorMessage);
      setOutput('');
    }
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('Failed to copy to clipboard');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setInput(output);
    setOutput(input);
    setError(null);
    setCopied(false);
  };

  // Auto-convert when input changes
  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.trim()) {
      setError(null);
      try {
        if (mode === 'encode') {
          const encoded = btoa(unescape(encodeURIComponent(value)));
          setOutput(encoded);
        } else {
          try {
            const decoded = decodeURIComponent(escape(atob(value)));
            setOutput(decoded);
          } catch (e) {
            setOutput('');
          }
        }
      } catch (e) {
        setOutput('');
      }
    } else {
      setOutput('');
    }
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-border bg-card p-4 sm:p-5 md:p-6'>
        <div className="flex items-center gap-3 mb-2">
          <div>
            <h1 className='text-xl sm:text-2xl font-semibold text-foreground'>Base64 Encoder/Decoder</h1>
            <p className='text-xs sm:text-sm text-muted-foreground'>Encode or decode text to/from Base64 format instantly</p>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto flex flex-col md:flex-row gap-6'>
          {/* Input Panel */}
          <div className='space-y-4'>
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-300'>
                    {mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}
                  </label>
                  <Button onClick={toggleMode} variant='outline' size='sm'>
                    <ArrowUpDown className='w-4 h-4 mr-2' />
                    Switch
                  </Button>
                </div>
                <Textarea
                  placeholder={
                    mode === 'encode' ? 'Enter text to encode to Base64...' : 'Enter Base64 string to decode...'
                  }
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  rows={12}
                  className='font-mono text-sm'
                />
              </CardContent>
            </Card>
            {error && (
              <Card className='border-red-900 bg-red-950/30'>
                <CardContent className='pt-6'>
                  <div className='flex items-start gap-3'>
                    <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                    <div>
                      <h3 className='font-semibold text-red-400 mb-2'>Conversion Failed</h3>
                      <p className='text-sm text-red-300'>{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Output Panel */}
          <div className='space-y-4'>
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-300'>
                    {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
                  </label>
                  <Button onClick={handleCopy} disabled={!output} variant='outline' size='sm'>
                    {copied ? (
                      <>
                        <Check className='w-4 h-4 mr-2' />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className='w-4 h-4 mr-2' />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  placeholder={
                    mode === 'encode' ? 'Base64 encoded output will appear here...' : 'Decoded text will appear here...'
                  }
                  value={output}
                  readOnly
                  rows={12}
                  className='font-mono text-sm bg-gray-950'
                />
              </CardContent>
            </Card>
            {!output && !error && input.trim() && (
              <Card className='border-dashed'>
                <CardContent className='pt-6'>
                  <div className='text-center text-gray-500 py-4'>
                    <ArrowUpDown className='w-8 h-8 mx-auto mb-2 opacity-50' />
                    <p className='text-sm'>Enter text to see the conversion</p>
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
