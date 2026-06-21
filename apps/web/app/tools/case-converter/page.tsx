'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { CaseSensitive } from 'lucide-react';

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#f0c674',
} as React.CSSProperties;

function Panel({ title, meta, children, style }: { title: string; meta?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bp-border)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{title}</span>
        {meta && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--bp-ink-faint)' }}>{meta}</span>}
      </div>
      {children}
    </div>
  );
}

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
    <div
      data-cat='text'
      style={{
        ...CSS_VARS,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bp-bg)',
        color: 'var(--bp-ink)',
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      }}
    >
      {/* Header */}
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>
          Case Converter
        </h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>
          Convert between camelCase, snake_case, kebab-case and more
        </p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top: 2-col layout — input left, preview right */}
        <div className='grid grid-cols-1 lg:grid-cols-2' style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Input panel */}
          <Panel
            title='Input Text'
            meta={input.trim() ? `${input.length} chars` : undefined}
            style={{ borderRight: 0, borderTop: 0 }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Enter text to convert...'
                spellCheck={false}
                style={{
                  flex: 1,
                  width: '100%',
                  background: 'var(--bp-bg)',
                  border: 0,
                  color: 'var(--bp-ink)',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  padding: '12px 14px',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: 1.65,
                }}
              />
              {!input.trim() && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 10, opacity: 0.4 }}>
                  <CaseSensitive style={{ width: 32, height: 32 }} />
                  <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>Enter text to see conversions in all formats</span>
                </div>
              )}
            </div>
          </Panel>

          {/* All Format Preview panel */}
          <Panel title='All Format Preview' style={{ borderTop: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {input.trim() ? (
                <div className='p-2 sm:p-3 grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3'>
                  {caseButtons.map((btn) => {
                    const result = convertToCase(input, btn.type);
                    return (
                      <div key={btn.type} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', fontWeight: 600 }}>
                          {btn.label}
                        </span>
                        <div
                          style={{
                            background: 'var(--bp-elevated)',
                            border: '1px solid var(--bp-border)',
                            padding: '5px 8px',
                            fontSize: 11,
                            color: 'var(--bp-ink)',
                            fontFamily: 'inherit',
                            wordBreak: 'break-all',
                            lineHeight: 1.5,
                          }}
                        >
                          {result}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--bp-ink-faint)' }}>No input yet</span>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Convert & Copy panel */}
        <Panel title='Convert & Copy' style={{ borderTop: 0, flexShrink: 0 }}>
          <div className='p-2 sm:p-3 flex flex-col gap-2 sm:gap-3' style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 6 }}>
              {caseButtons.map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => setCurrentCase(btn.type)}
                  disabled={!input.trim()}
                  type='button'
                  className={`bp-btn min-h-10 px-3 py-2 ${currentCase === btn.type ? 'bp-btn-solid' : ''}`}
                  style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 11 }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            {currentCase && input.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--bp-border-str)', paddingTop: 10 }}>
                <code
                  style={{
                    flex: 1,
                    background: 'var(--bp-elevated)',
                    border: '1px solid var(--bp-border)',
                    color: 'var(--bp-ink)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    padding: '6px 10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {convertToCase(input, currentCase)}
                </code>
                <BpCopyBtn text={convertToCase(input, currentCase)} label='COPY' />
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
