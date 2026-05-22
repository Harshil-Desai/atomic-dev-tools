'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { CaseSensitive } from 'lucide-react';

type CaseType =
  | 'camelCase'
  | 'PascalCase'
  | 'snake_case'
  | 'kebab-case'
  | 'SCREAMING_SNAKE_CASE'
  | 'UPPER_CASE'
  | 'lower_case'
  | 'Title_Case'
  | 'Sentence_case'
  | 'Toggle_Case';

export default function CaseConverterPage() {
  const [input, setInput] = useState('');
  const [currentCase, setCurrentCase] = useState<CaseType | null>(null);

  const splitWords = (text: string): string[] => {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-\s]+/g, ' ')
      .split(' ')
      .filter((word) => word.length > 0);
  };

  const convertToCase = (text: string, targetCase: CaseType): string => {
    if (!text.trim()) return '';
    const words = splitWords(text);
    switch (targetCase) {
      case 'camelCase':
        return words.map((word, idx) => (idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())).join('');
      case 'PascalCase':
        return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
      case 'snake_case':
        return words.map((word) => word.toLowerCase()).join('_');
      case 'kebab-case':
        return words.map((word) => word.toLowerCase()).join('-');
      case 'SCREAMING_SNAKE_CASE':
        return words.map((word) => word.toUpperCase()).join('_');
      case 'UPPER_CASE':
        return text.toUpperCase();
      case 'lower_case':
        return text.toLowerCase();
      case 'Title_Case':
        return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      case 'Sentence_case':
        return words.map((word, idx) => (idx === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase())).join(' ');
      case 'Toggle_Case':
        return text.split('').map((char) => (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase())).join('');
    }
  };

  const caseButtons: Array<{ type: CaseType; label: string }> = [
    { type: 'camelCase', label: 'camelCase' },
    { type: 'PascalCase', label: 'PascalCase' },
    { type: 'snake_case', label: 'snake_case' },
    { type: 'kebab-case', label: 'kebab-case' },
    { type: 'SCREAMING_SNAKE_CASE', label: 'SCREAMING_SNAKE_CASE' },
    { type: 'UPPER_CASE', label: 'UPPER CASE' },
    { type: 'lower_case', label: 'lower case' },
    { type: 'Title_Case', label: 'Title Case' },
    { type: 'Sentence_case', label: 'Sentence case' },
    { type: 'Toggle_Case', label: 'tOGGLE cASE' },
  ];

  return (
    <BpToolStage cat='text'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>String Case Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert text between different case formats with one click</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          <BpPanel title='Input Text' meta={input.trim() ? `${input.length} chars` : undefined}>
            <textarea className='bp-textarea font-mono text-sm' placeholder='Enter text to convert...' value={input} onChange={(e) => setInput(e.target.value)} rows={6} />
          </BpPanel>

          {input.trim() && (
            <BpPanel title='All Format Preview'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {caseButtons.map((btn) => {
                  const result = convertToCase(input, btn.type);
                  return (
                    <div key={btn.type} className='space-y-1'>
                      <div className='text-xs text-gray-500 font-semibold uppercase tracking-wider'>{btn.label}</div>
                      <div className='bp-code-view px-3 py-2 font-mono text-sm text-gray-300 break-all'>{result}</div>
                    </div>
                  );
                })}
              </div>
            </BpPanel>
          )}

          <BpPanel title='Convert & Copy'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
              {caseButtons.map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => setCurrentCase(btn.type)}
                  disabled={!input.trim()}
                  type='button'
                  className={`bp-btn text-left justify-start ${currentCase === btn.type ? 'bp-btn-solid' : ''}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            {currentCase && input.trim() && (
              <div className='mt-3 flex items-center gap-3'>
                <code className='flex-1 bp-code-view font-mono text-sm px-3 py-2 truncate'>{convertToCase(input, currentCase)}</code>
                <BpCopyBtn text={convertToCase(input, currentCase)} label='COPY' />
              </div>
            )}
          </BpPanel>

          {!input.trim() && (
            <div className='text-center text-gray-600 py-12'>
              <CaseSensitive className='w-12 h-12 mx-auto mb-4 opacity-40' />
              <p className='text-sm'>Enter text to see conversions in all formats</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
