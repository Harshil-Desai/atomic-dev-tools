'use client';

import { useState, useEffect, useCallback } from 'react';
import { Type, RefreshCw } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

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
    <BpToolStage cat='text'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Lorem Ipsum Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Generate classic Lorem Ipsum placeholder text for your designs and mockups</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          <BpPanel title='Configuration'>
            <div className='flex flex-wrap gap-4 items-end mb-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Generate Type</label>
                <div className='flex rounded border border-[hsla(0,0%,20%,1)] overflow-hidden'>
                  {(['words', 'sentences', 'paragraphs'] as GenerationType[]).map((t) => (
                    <button key={t} onClick={() => setType(t)} type='button'
                      className={`px-4 py-2 text-xs font-medium transition-colors capitalize ${type === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Count ({countLabel})</label>
                <input type='number' min={1} max={maxCount} value={count}
                  onChange={e => setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value) || 1)))}
                  className='bp-input w-24 font-mono' />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Output</label>
                <div className='flex rounded border border-[hsla(0,0%,20%,1)] overflow-hidden'>
                  {(['plain', 'html'] as OutputFormat[]).map((f) => (
                    <button key={f} onClick={() => setFormat(f)} type='button'
                      className={`px-3 py-2 text-xs font-medium transition-colors capitalize ${format === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
                      {f === 'plain' ? 'Plain Text' : 'HTML'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className='flex flex-wrap gap-4 items-center'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input type='checkbox' checked={startWithLorem} onChange={e => setStartWithLorem(e.target.checked)} className='w-4 h-4 rounded' />
                <span className='text-sm text-gray-300'>Start with <span className='font-mono text-xs text-blue-400'>"Lorem ipsum..."</span></span>
              </label>
              <button className='bp-btn bp-btn-solid' onClick={generate} type='button'>
                <RefreshCw className='w-4 h-4 mr-2 inline' />GENERATE
              </button>
            </div>
          </BpPanel>

          <BpPanel title='Generated Text' meta={`${wordCount} words · ${charCount} chars`}>
            <div className='bp-panel-actions mb-3'>
              <BpCopyBtn text={output} label='COPY' />
            </div>
            <textarea className='bp-textarea font-mono text-sm' value={output} readOnly rows={14} placeholder='Click Generate to produce Lorem Ipsum text...' />
          </BpPanel>

          <BpPanel title='Quick Generate'>
            <div className='flex flex-wrap gap-2'>
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
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
