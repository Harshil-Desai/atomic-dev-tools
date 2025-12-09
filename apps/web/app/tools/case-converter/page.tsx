'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { CaseSensitive, Copy, Check } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  const splitWords = (text: string): string[] => {
    // Split on various word boundaries (spaces, hyphens, underscores, capitals)
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
      .replace(/[_\-\s]+/g, ' ') // Replace _, -, and spaces with single space
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
        return words
          .map((word, idx) => (idx === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()))
          .join(' ');
      case 'Toggle_Case':
        return text
          .split('')
          .map((char) => (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()))
          .join('');
    }
  };

  const handleCaseClick = async (targetCase: CaseType) => {
    const result = convertToCase(input, targetCase);
    setCurrentCase(targetCase);

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy');
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
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>String Case Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert text between different case formats with one click</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <label className='block text-xs sm:text-sm font-medium text-gray-300'>Input Text</label>
              <Textarea
                placeholder='Enter text to convert...'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                className='font-mono text-sm'
              />
              {input.trim() && (
                <div className='text-xs text-gray-500'>
                  {input.length} character{input.length !== 1 ? 's' : ''}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Copy Confirmation */}
          {copied && (
            <Card className='border-green-900 bg-green-950/30'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-2 text-green-400'>
                  <Check className='w-5 h-5' />
                  <span className='text-sm font-semibold'>Copied to clipboard!</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Convert All Preview */}
          {input.trim() && (
            <Card>
              <CardContent className='pt-6'>
                <h3 className='text-xs sm:text-sm font-semibold text-gray-300 mb-3'>Live Preview - All Formats</h3>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                  {caseButtons.map((btn) => {
                    const result = convertToCase(input, btn.type);
                    return (
                      <div key={btn.type} className='space-y-2'>
                        <div className='text-xs text-gray-500 font-semibold uppercase tracking-wider'>{btn.label}</div>
                        <div className='bg-gray-950 rounded-md p-3 font-mono text-sm text-gray-300 break-words'>{result}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Convert Buttons */}
          <Card>
            <CardContent className='pt-6'>
              <h3 className='text-sm font-semibold text-gray-300 mb-4'>Convert & Copy</h3>
              <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-3'>
                {caseButtons.map((btn) => (
                  <Button
                    key={btn.type}
                    onClick={() => handleCaseClick(btn.type)}
                    disabled={!input.trim()}
                    variant={currentCase === btn.type ? 'default' : 'outline'}
                    className='justify-start'
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {!input.trim() && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <CaseSensitive className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Enter text to see conversions in all formats</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

