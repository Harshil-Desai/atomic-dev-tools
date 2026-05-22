'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Code2, AlertCircle, Minimize2, Sparkles } from 'lucide-react';

type Language = 'json' | 'javascript' | 'css' | 'html';
type Action = 'minify' | 'beautify';

export default function CodeFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState<Language>('json');
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
    let result = code;
    const indentStr = indent === 0 ? '' : ' '.repeat(indent);
    result = result.replace(/;/g, ';\n');
    result = result.replace(/\{/g, '\n{\n');
    result = result.replace(/\}/g, '\n}\n');
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
    let result = code;
    result = result.replace(/\/\/.*$/gm, '');
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s*([=+\-*/<>{}();,.])\s*/g, '$1');
    return result.trim();
  };

  const beautifyCss = (code: string, indent: number): string => {
    let result = code;
    const indentStr = ' '.repeat(indent);
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/;/g, ';\n');
    result = result.replace(/\}/g, '}\n\n');
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
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s*([{}:;,])\s*/g, '$1');
    result = result.replace(/;\}/g, '}');
    return result.trim();
  };

  const beautifyHtml = (code: string, indent: number): string => {
    let result = code;
    const indentStr = ' '.repeat(indent);
    result = result.replace(/>\s+</g, '><');
    result = result.replace(/(<\/\w+>)/g, '$1\n');
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
    result = result.replace(/<!--[\s\S]*?-->/g, '');
    result = result.replace(/\s+/g, ' ');
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
      setInputStats({ lines: input.split('\n').length, chars: input.length });
      setOutputStats({ lines: result.split('\n').length, chars: result.length });
      const reductionPercent = action === 'minify' && input.length > 0
        ? Math.round(((input.length - result.length) / input.length) * 100)
        : null;
      setReduction(reductionPercent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setOutput('');
      setOutputStats({ lines: 0, chars: 0 });
      setReduction(null);
    }
  };

  return (
    <BpToolStage cat='text'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Code Minifier/Beautifier</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Format or minify code in various languages</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          <BpPanel title='Configuration'>
            <div className='flex flex-wrap items-end gap-3 mb-3'>
              <div className='flex-1 min-w-32'>
                <label className='block text-xs text-gray-500 mb-1'>Language</label>
                <select className='bp-input w-full' value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                  <option value='json'>JSON</option>
                  <option value='javascript'>JavaScript</option>
                  <option value='css'>CSS</option>
                  <option value='html'>HTML</option>
                </select>
              </div>
              <div className='flex-1 min-w-32'>
                <label className='block text-xs text-gray-500 mb-1'>Indentation Size</label>
                <select className='bp-input w-full' value={indentSize} onChange={(e) => setIndentSize(parseInt(e.target.value))}>
                  <option value='0'>0 (none)</option>
                  <option value='2'>2 spaces</option>
                  <option value='4'>4 spaces</option>
                  <option value='8'>8 spaces</option>
                </select>
              </div>
            </div>
            <div className='flex gap-2'>
              <button className='bp-btn bp-btn-solid flex-1' onClick={() => handleProcess('beautify')} disabled={!input.trim()} type='button'>
                <Sparkles className='w-4 h-4 mr-2 inline' />BEAUTIFY
              </button>
              <button className='bp-btn flex-1' onClick={() => handleProcess('minify')} disabled={!input.trim()} type='button'>
                <Minimize2 className='w-4 h-4 mr-2 inline' />MINIFY
              </button>
            </div>
          </BpPanel>

          <div className='bp-layout-2col'>
            <BpPanel title='Input Code' meta={inputStats.chars > 0 ? `${inputStats.lines} lines · ${inputStats.chars} chars` : undefined}>
              <textarea className='bp-textarea font-mono text-sm' placeholder={`Enter ${language.toUpperCase()} code here...`} value={input} onChange={(e) => setInput(e.target.value)} rows={12} />
            </BpPanel>

            <BpPanel title='Output Code' meta={outputStats.chars > 0 ? `${outputStats.lines} lines · ${outputStats.chars} chars${reduction !== null && reduction > 0 ? ` · ${reduction}% smaller` : ''}` : undefined}>
              <div className='bp-panel-actions mb-3'>
                <BpCopyBtn text={output} label='COPY' />
              </div>
              <textarea className='bp-textarea font-mono text-sm' placeholder='Formatted code will appear here...' value={output} readOnly rows={12} />
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
              <Code2 className='w-12 h-12 mx-auto mb-4 opacity-40' />
              <p className='text-sm'>Enter code and choose an operation to get started</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
