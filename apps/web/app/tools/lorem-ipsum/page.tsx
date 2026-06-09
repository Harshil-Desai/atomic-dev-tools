'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

type GenerationType = 'words' | 'sentences' | 'paragraphs';
type OutputFormat = 'plain' | 'html';

const LOREM_WORDS: string[] = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'reprehenderit', 'voluptate', 'velit',
  'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat',
  'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt',
  'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde', 'omnis',
  'natus', 'error', 'voluptatem', 'accusantium', 'doloremque', 'laudantium',
  'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo', 'inventore',
  'veritatis', 'architecto', 'beatae', 'vitae', 'dicta', 'explicabo', 'nemo',
  'ipsam', 'quia', 'voluptas', 'aspernatur', 'odit', 'fugit', 'consequuntur',
  'magni', 'dolores', 'eos', 'ratione', 'sequi', 'nesciunt', 'neque', 'porro',
  'quisquam', 'dolorem', 'adipisci', 'numquam', 'eius', 'modi', 'tempora',
  'incidunt', 'quaerat', 'aut', 'facilis', 'possimus', 'assumenda', 'repellendus',
  'temporibus', 'autem', 'quibusdam', 'officiis', 'debitis', 'rerum', 'necessitatibus',
  'saepe', 'eveniet', 'voluptates', 'repudiandae', 'recusandae', 'itaque', 'earum',
  'hic', 'tenetur', 'sapiente', 'delectus', 'reiciendis', 'voluptatibus', 'maiores',
  'alias', 'perferendis', 'doloribus', 'asperiores', 'repellat',
];

const LOREM_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickWord(exclude?: string): string { let w: string; do { w = LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]; } while (exclude && w === exclude); return w; }
function generateWords(count: number): string { const words: string[] = []; for (let i = 0; i < count; i++) words.push(pickWord(words[words.length - 1])); return words.join(' '); }
function capitalize(str: string): string { return str.charAt(0).toUpperCase() + str.slice(1); }
function generateSentence(wordCount?: number): string { const n = wordCount ?? randomInt(8, 18); const words: string[] = []; for (let i = 0; i < n; i++) words.push(pickWord(words[words.length - 1])); return capitalize(words.join(' ')) + '.'; }
function generateSentences(count: number): string { return Array.from({ length: count }, () => generateSentence()).join(' '); }
function generateParagraph(): string { return generateSentences(randomInt(4, 8)); }

function buildOutput(type: GenerationType, count: number, startWithLorem: boolean, format: OutputFormat): string {
  const n = Math.max(1, count);
  if (type === 'words') {
    let result = generateWords(n);
    if (startWithLorem && n >= 5) { const lw = 'lorem ipsum dolor sit amet'.split(' '); const rest = generateWords(Math.max(0, n - lw.length)); result = (lw.join(' ') + (rest ? ' ' + rest : '')).trim(); }
    return format === 'html' ? `<p>${result}</p>` : result;
  }
  if (type === 'sentences') {
    const sentences: string[] = [];
    if (startWithLorem) { sentences.push(LOREM_START); for (let i = 1; i < n; i++) sentences.push(generateSentence()); }
    else for (let i = 0; i < n; i++) sentences.push(generateSentence());
    return format === 'html' ? `<p>${sentences.join(' ')}</p>` : sentences.join(' ');
  }
  const paragraphs: string[] = [];
  if (startWithLorem) { const fs: string[] = [LOREM_START]; for (let i = 0; i < randomInt(3, 7); i++) fs.push(generateSentence()); paragraphs.push(fs.join(' ')); for (let i = 1; i < n; i++) paragraphs.push(generateParagraph()); }
  else for (let i = 0; i < n; i++) paragraphs.push(generateParagraph());
  return format === 'html' ? paragraphs.map(p => `<p>${p}</p>`).join('\n') : paragraphs.join('\n\n');
}

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

export default function LoremIpsumPage() {
  const [type, setType] = useState<GenerationType>('paragraphs');
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [format, setFormat] = useState<OutputFormat>('plain');
  const [output, setOutput] = useState('');

  const generate = useCallback(() => setOutput(buildOutput(type, count, startWithLorem, format)), [type, count, startWithLorem, format]);

  useEffect(() => { generate(); }, [generate]);

  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;
  const charCount = output.length;

  const maxCount = type === 'words' ? 1000 : type === 'sentences' ? 200 : 50;
  const countLabel = type === 'words' ? `word${count !== 1 ? 's' : ''}` : type === 'sentences' ? `sentence${count !== 1 ? 's' : ''}` : `paragraph${count !== 1 ? 's' : ''}`;

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
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.01em' }}>Lorem Ipsum Generator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: '2px 0 0' }}>Generate placeholder text — words, sentences or paragraphs</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 0 }}>

        {/* Configuration Panel */}
        <Panel title='Configuration' style={{ flexShrink: 0, borderTop: 0, borderLeft: 0, borderRight: 0 }}>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              {/* Generate Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Generate Type</span>
                <div style={{ display: 'flex', border: '1px solid var(--bp-border-str)', overflow: 'hidden' }}>
                  {(['words', 'sentences', 'paragraphs'] as GenerationType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      type='button'
                      style={{
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 500,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        border: 0,
                        borderRight: t !== 'paragraphs' ? '1px solid var(--bp-border-str)' : 0,
                        background: type === t ? 'var(--bp-accent)' : 'var(--bp-bg)',
                        color: type === t ? '#0a0e14' : 'var(--bp-ink-mute)',
                        transition: 'background 0.15s, color 0.15s',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Count ({countLabel})</span>
                <input
                  type='number'
                  min={1}
                  max={maxCount}
                  value={count}
                  onChange={e => setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value) || 1)))}
                  style={{
                    width: 80,
                    background: 'var(--bp-bg)',
                    border: '1px solid var(--bp-border-str)',
                    color: 'var(--bp-ink)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    padding: '6px 10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Output Format */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Output Format</span>
                <div style={{ display: 'flex', border: '1px solid var(--bp-border-str)', overflow: 'hidden' }}>
                  {(['plain', 'html'] as OutputFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      type='button'
                      style={{
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: 0,
                        borderRight: f === 'plain' ? '1px solid var(--bp-border-str)' : 0,
                        background: format === f ? 'var(--bp-accent)' : 'var(--bp-bg)',
                        color: format === f ? '#0a0e14' : 'var(--bp-ink-mute)',
                        transition: 'background 0.15s, color 0.15s',
                        fontFamily: 'inherit',
                      }}
                    >
                      {f === 'plain' ? 'Plain Text' : 'HTML'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={startWithLorem}
                  onChange={e => setStartWithLorem(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--bp-accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'var(--bp-ink)' }}>
                  Start with{' '}
                  <span style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--bp-accent)' }}>"Lorem ipsum..."</span>
                </span>
              </label>
              <button className='bp-btn bp-btn-solid' onClick={generate} type='button'>
                <RefreshCw className='w-4 h-4 mr-2 inline' />GENERATE
              </button>
            </div>
          </div>
        </Panel>

        {/* Generated Text Panel */}
        <Panel
          title='Generated Text'
          meta={`${wordCount} words · ${charCount} chars`}
          style={{ flex: 1, minHeight: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <textarea
              value={output}
              readOnly
              placeholder='Click Generate to produce Lorem Ipsum text...'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0, flexWrap: 'wrap' }}>
              <BpCopyBtn text={output} label='COPY' />
            </div>
          </div>
        </Panel>

        {/* Quick Generate Panel */}
        <Panel title='Quick Generate' style={{ flexShrink: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
            {[
              { label: '1 paragraph', t: 'paragraphs' as GenerationType, c: 1 },
              { label: '3 paragraphs', t: 'paragraphs' as GenerationType, c: 3 },
              { label: '5 paragraphs', t: 'paragraphs' as GenerationType, c: 5 },
              { label: '1 sentence', t: 'sentences' as GenerationType, c: 1 },
              { label: '5 sentences', t: 'sentences' as GenerationType, c: 5 },
              { label: '50 words', t: 'words' as GenerationType, c: 50 },
              { label: '100 words', t: 'words' as GenerationType, c: 100 },
              { label: '200 words', t: 'words' as GenerationType, c: 200 },
            ].map(({ label, t, c }) => (
              <button key={label} type='button' className='bp-btn' onClick={() => { setType(t); setCount(c); }}>{label}</button>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}
