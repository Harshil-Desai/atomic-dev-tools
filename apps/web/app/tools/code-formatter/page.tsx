'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { Code2, Copy, Check, AlertCircle, Minimize2, Sparkles } from 'lucide-react';

type Language = 'json' | 'javascript' | 'css' | 'html';
type Action = 'minify' | 'beautify';

export default function CodeFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState<Language>('json');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indentSize, setIndentSize] = useState(2);
  const [inputStats, setInputStats] = useState({ lines: 0, chars: 0 });
  const [outputStats, setOutputStats] = useState({ lines: 0, chars: 0 });
  const [reduction, setReduction] = useState<number | null>(null);

  const beautifyJson = (code: string, indent: number): string => {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, indent === 0 ? 0 : indent);
    } catch (e) {
      throw new Error('Invalid JSON syntax');
    }
  };

  const minifyJson = (code: string): string => {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed);
    } catch (e) {
      throw new Error('Invalid JSON syntax');
    }
  };

  const beautifyJavaScript = (code: string, indent: number): string => {
    // Basic JavaScript beautification
    let result = code;
    const indentStr = indent === 0 ? '' : ' '.repeat(indent);

    // Add newlines after semicolons (simple approach)
    result = result.replace(/;/g, ';\n');

    // Add newlines before opening braces
    result = result.replace(/\{/g, '\n{\n');

    // Add newlines before closing braces
    result = result.replace(/\}/g, '\n}\n');

    // Add indentation (very basic)
    const lines = result.split('\n');
    let indentLevel = 0;
    const indented = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';
      if (trimmed === '}' || trimmed === '});') indentLevel = Math.max(0, indentLevel - 1);
      const indentedLine = indentStr.repeat(indentLevel) + trimmed;
      if (trimmed === '{' || trimmed.includes('{')) indentLevel++;
      return indentedLine;
    });

    return indented.join('\n');
  };

  const minifyJavaScript = (code: string): string => {
    // Basic JavaScript minification - remove comments and extra whitespace
    let result = code;

    // Remove single-line comments
    result = result.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove extra whitespace
    result = result.replace(/\s+/g, ' ');

    // Remove whitespace around operators
    result = result.replace(/\s*([=+\-*/<>{}();,.])\s*/g, '$1');

    return result.trim();
  };

  const beautifyCss = (code: string, indent: number): string => {
    let result = code;
    const indentStr = ' '.repeat(indent);

    // Remove existing formatting
    result = result.replace(/\s+/g, ' ');

    // Add newlines after semicolons
    result = result.replace(/;/g, ';\n');

    // Add newlines after closing braces
    result = result.replace(/\}/g, '}\n\n');

    // Add indentation
    const lines = result.split('\n');
    let indentLevel = 0;
    const indented = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';
      if (trimmed.startsWith('}')) indentLevel = Math.max(0, indentLevel - 1);
      const indentedLine = indentStr.repeat(indentLevel) + trimmed;
      if (trimmed.startsWith('{')) indentLevel++;
      return indentedLine;
    });

    return indented.join('\n').trim();
  };

  const minifyCss = (code: string): string => {
    let result = code;

    // Remove comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove extra whitespace
    result = result.replace(/\s+/g, ' ');

    // Remove whitespace around operators
    result = result.replace(/\s*([{}:;,])\s*/g, '$1');

    // Remove semicolon before closing brace
    result = result.replace(/;\}/g, '}');

    return result.trim();
  };

  const beautifyHtml = (code: string, indent: number): string => {
    let result = code;
    const indentStr = ' '.repeat(indent);

    // Remove existing whitespace between tags
    result = result.replace(/>\s+</g, '><');

    // Add newlines after closing tags
    result = result.replace(/(<\/\w+>)/g, '$1\n');

    // Basic indentation
    const lines = result.split('\n');
    let indentLevel = 0;
    const indented = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';
      if (trimmed.startsWith('</')) indentLevel = Math.max(0, indentLevel - 1);
      const indentedLine = indentStr.repeat(indentLevel) + trimmed;
      if (trimmed.match(/<[^/]/)) indentLevel++;
      return indentedLine;
    });

    return indented.join('\n').trim();
  };

  const minifyHtml = (code: string): string => {
    let result = code;

    // Remove comments
    result = result.replace(/<!--[\s\S]*?-->/g, '');

    // Remove extra whitespace
    result = result.replace(/\s+/g, ' ');

    // Remove whitespace between tags
    result = result.replace(/>\s+</g, '><');

    return result.trim();
  };

  const handleProcess = (action: Action) => {
    setError(null);
    try {
      let result = '';
      const indent = action === 'beautify' ? indentSize : 0;

      if (language === 'json') {
        result = action === 'beautify' ? beautifyJson(input, indent) : minifyJson(input);
      } else if (language === 'javascript') {
        result = action === 'beautify' ? beautifyJavaScript(input, indent) : minifyJavaScript(input);
      } else if (language === 'css') {
        result = action === 'beautify' ? beautifyCss(input, indent) : minifyCss(input);
      } else if (language === 'html') {
        result = action === 'beautify' ? beautifyHtml(input, indent) : minifyHtml(input);
      }

      setOutput(result);
      setInputStats({
        lines: input.split('\n').length,
        chars: input.length,
      });
      setOutputStats({
        lines: result.split('\n').length,
        chars: result.length,
      });

      // Calculate reduction percentage
      const reductionPercent = action === 'minify' && inputStats.chars > 0
        ? Math.round(((inputStats.chars - result.length) / inputStats.chars) * 100)
        : null;
      setReduction(reductionPercent);

      setCopied(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred';
      setError(errorMessage);
      setOutput('');
      setOutputStats({ lines: 0, chars: 0 });
      setReduction(null);
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
      <div className='border-b border-gray-800 bg-gray-900 p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>Code Minifier/Beautifier</h1>
        <p className='text-gray-400'>Format or minify code in various languages</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Configuration */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='json'>JSON</option>
                    <option value='javascript'>JavaScript</option>
                    <option value='css'>CSS</option>
                    <option value='html'>HTML</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Indentation Size</label>
                  <select
                    value={indentSize}
                    onChange={(e) => setIndentSize(parseInt(e.target.value))}
                    className='w-full h-10 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='0'>0 (none)</option>
                    <option value='2'>2 spaces</option>
                    <option value='4'>4 spaces</option>
                    <option value='8'>8 spaces</option>
                  </select>
                </div>
              </div>
              <div className='flex gap-2'>
                <Button onClick={() => handleProcess('beautify')} disabled={!input.trim()} className='flex-1' size='lg'>
                  <Sparkles className='w-4 h-4 mr-2' />
                  Beautify
                </Button>
                <Button onClick={() => handleProcess('minify')} disabled={!input.trim()} variant='outline' className='flex-1' size='lg'>
                  <Minimize2 className='w-4 h-4 mr-2' />
                  Minify
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <label className='block text-sm font-medium text-gray-300'>Input Code</label>
              <Textarea
                placeholder={`Enter ${language.toUpperCase()} code here...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={12}
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

          {/* Statistics */}
          {(inputStats.lines > 0 || outputStats.lines > 0) && (
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-6 text-sm'>
                  <div>
                    <span className='text-gray-500'>Input: </span>
                    <span className='text-gray-300'>{inputStats.lines} lines, {inputStats.chars} chars</span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Output: </span>
                    <span className='text-gray-300'>{outputStats.lines} lines, {outputStats.chars} chars</span>
                  </div>
                  {reduction !== null && reduction > 0 && (
                    <div>
                      <span className='text-gray-500'>Reduction: </span>
                      <span className='text-green-400 font-semibold'>{reduction}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Output */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='flex items-center justify-between'>
                <label className='block text-sm font-medium text-gray-300'>Output Code</label>
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
                placeholder='Formatted code will appear here...'
                value={output}
                readOnly
                rows={12}
                className='font-mono text-sm bg-gray-950'
              />
            </CardContent>
          </Card>

          {!input.trim() && !error && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <Code2 className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Enter code and choose an operation to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

