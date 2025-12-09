'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea, Input } from '@/ui';
import { Type, Copy, Check, AlertCircle } from 'lucide-react';

type EscapeType = 'url' | 'html' | 'javascript' | 'json' | 'base64' | 'unicode';

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

const HTML_ENTITIES_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(HTML_ENTITIES).map(([key, value]) => [value, key]),
);

export default function TextEscapePage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [escapeType, setEscapeType] = useState<EscapeType>('url');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputChars, setInputChars] = useState(0);
  const [outputChars, setOutputChars] = useState(0);

  const handleInputChange = (value: string) => {
    setInput(value);
    setInputChars(value.length);
  };

  const escapeUrl = (text: string): string => {
    return encodeURIComponent(text);
  };

  const unescapeUrl = (text: string): string => {
    try {
      return decodeURIComponent(text);
    } catch (e) {
      throw new Error('Invalid URL encoding');
    }
  };

  const escapeHtml = (text: string): string => {
    return text
      .split('')
      .map((char) => HTML_ENTITIES[char] || char)
      .join('');
  };

  const unescapeHtml = (text: string): string => {
    let result = text;
    Object.entries(HTML_ENTITIES_REVERSE).forEach(([entity, char]) => {
      result = result.replace(new RegExp(entity, 'g'), char);
    });
    // Handle numeric entities
    result = result.replace(/&#x([0-9A-Fa-f]+);/g, (match, code) => String.fromCharCode(parseInt(code, 16)));
    result = result.replace(/&#([0-9]+);/g, (match, code) => String.fromCharCode(parseInt(code, 10)));
    return result;
  };

  const escapeJavaScript = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  };

  const unescapeJavaScript = (text: string): string => {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  };

  const escapeJson = (text: string): string => {
    return JSON.stringify(text);
  };

  const unescapeJson = (text: string): string => {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON string');
    }
  };

  const escapeBase64 = (text: string): string => {
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (e) {
      throw new Error('Failed to encode to Base64');
    }
  };

  const unescapeBase64 = (text: string): string => {
    try {
      return decodeURIComponent(escape(atob(text)));
    } catch (e) {
      throw new Error('Invalid Base64 string');
    }
  };

  const escapeUnicode = (text: string): string => {
    return text
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code > 127) {
          return '\\u' + code.toString(16).padStart(4, '0');
        }
        return char;
      })
      .join('');
  };

  const unescapeUnicode = (text: string): string => {
    return text.replace(/\\u([0-9A-Fa-f]{4})/g, (match, code) => String.fromCharCode(parseInt(code, 16)));
  };

  const handleEscape = () => {
    setError(null);
    try {
      let result = '';
      switch (escapeType) {
        case 'url':
          result = escapeUrl(input);
          break;
        case 'html':
          result = escapeHtml(input);
          break;
        case 'javascript':
          result = escapeJavaScript(input);
          break;
        case 'json':
          result = escapeJson(input);
          break;
        case 'base64':
          result = escapeBase64(input);
          break;
        case 'unicode':
          result = escapeUnicode(input);
          break;
      }
      setOutput(result);
      setOutputChars(result.length);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred';
      setError(errorMessage);
      setOutput('');
      setOutputChars(0);
    }
  };

  const handleUnescape = () => {
    setError(null);
    try {
      let result = '';
      switch (escapeType) {
        case 'url':
          result = unescapeUrl(input);
          break;
        case 'html':
          result = unescapeHtml(input);
          break;
        case 'javascript':
          result = unescapeJavaScript(input);
          break;
        case 'json':
          result = unescapeJson(input);
          break;
        case 'base64':
          result = unescapeBase64(input);
          break;
        case 'unicode':
          result = unescapeUnicode(input);
          break;
      }
      setOutput(result);
      setOutputChars(result.length);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred';
      setError(errorMessage);
      setOutput('');
      setOutputChars(0);
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

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>Text Escape/Unescape</h1>
        <p className='text-gray-400'>Encode or decode text in various formats instantly</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Configuration */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Escape Type</label>
                <select
                  value={escapeType}
                  onChange={(e) => setEscapeType(e.target.value as EscapeType)}
                  className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='url'>URL Encoding</option>
                  <option value='html'>HTML Entities</option>
                  <option value='javascript'>JavaScript Strings</option>
                  <option value='json'>JSON Strings</option>
                  <option value='base64'>Base64</option>
                  <option value='unicode'>Unicode Escape</option>
                </select>
              </div>
              <div className='flex gap-2'>
                <Button onClick={handleEscape} disabled={!input.trim()} className='flex-1' size='lg'>
                  Escape
                </Button>
                <Button onClick={handleUnescape} disabled={!input.trim()} variant='outline' className='flex-1' size='lg'>
                  Unescape
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='flex items-center justify-between'>
                <label className='block text-sm font-medium text-gray-300'>Input Text</label>
                <span className='text-xs text-gray-500'>{inputChars} characters</span>
              </div>
              <Textarea
                placeholder='Enter text to escape or unescape...'
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                rows={10}
                className='font-mono text-sm'
              />
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
                    <p className='text-sm text-red-300'>{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Output */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='flex items-center justify-between'>
                <label className='block text-sm font-medium text-gray-300'>Output Text</label>
                <div className='flex items-center gap-4'>
                  <span className='text-xs text-gray-500'>{outputChars} characters</span>
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
              </div>
              <Textarea
                placeholder='Result will appear here...'
                value={output}
                readOnly
                rows={10}
                className='font-mono text-sm bg-gray-950'
              />
            </CardContent>
          </Card>

          {!input.trim() && !error && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Type className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Enter text and choose an operation to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

