'use client';

import { useState, useEffect, useCallback } from 'react';
import { Type, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/ui';
import { Card, CardContent } from '@/ui';
import { Input } from '@/ui';
import { Textarea } from '@/ui';

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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWord(exclude?: string): string {
  let w: string;
  do {
    w = LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
  } while (exclude && w === exclude);
  return w;
}

function generateWords(count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(pickWord(words[words.length - 1]));
  }
  return words.join(' ');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateSentence(wordCount?: number): string {
  const n = wordCount ?? randomInt(8, 18);
  const words: string[] = [];
  for (let i = 0; i < n; i++) {
    words.push(pickWord(words[words.length - 1]));
  }
  return capitalize(words.join(' ')) + '.';
}

function generateSentences(count: number): string {
  return Array.from({ length: count }, () => generateSentence()).join(' ');
}

function generateParagraph(): string {
  const sentenceCount = randomInt(4, 8);
  return generateSentences(sentenceCount);
}

function generateParagraphs(count: number): string[] {
  return Array.from({ length: count }, () => generateParagraph());
}

function buildOutput(
  type: GenerationType,
  count: number,
  startWithLorem: boolean,
  format: OutputFormat
): string {
  const n = Math.max(1, count);

  if (type === 'words') {
    let result = generateWords(n);
    if (startWithLorem && n >= 5) {
      const loremWords = 'lorem ipsum dolor sit amet'.split(' ');
      const rest = generateWords(Math.max(0, n - loremWords.length));
      result = (loremWords.join(' ') + (rest ? ' ' + rest : '')).trim();
    }
    if (format === 'html') {
      return `<p>${result}</p>`;
    }
    return result;
  }

  if (type === 'sentences') {
    const sentences: string[] = [];
    if (startWithLorem) {
      sentences.push(LOREM_START);
      for (let i = 1; i < n; i++) sentences.push(generateSentence());
    } else {
      for (let i = 0; i < n; i++) sentences.push(generateSentence());
    }
    const text = sentences.join(' ');
    if (format === 'html') return `<p>${text}</p>`;
    return text;
  }

  // paragraphs
  const paragraphs: string[] = [];
  if (startWithLorem) {
    const firstSentences: string[] = [LOREM_START];
    const extra = randomInt(3, 7);
    for (let i = 0; i < extra; i++) firstSentences.push(generateSentence());
    paragraphs.push(firstSentences.join(' '));
    for (let i = 1; i < n; i++) paragraphs.push(generateParagraph());
  } else {
    for (let i = 0; i < n; i++) paragraphs.push(generateParagraph());
  }

  if (format === 'html') {
    return paragraphs.map(p => `<p>${p}</p>`).join('\n');
  }
  return paragraphs.join('\n\n');
}

export default function LoremIpsumPage() {
  const [type, setType] = useState<GenerationType>('paragraphs');
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [format, setFormat] = useState<OutputFormat>('plain');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    const result = buildOutput(type, count, startWithLorem, format);
    setOutput(result);
  }, [type, count, startWithLorem, format]);

  // Auto-generate on mount and when params change
  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;
  const charCount = output.length;

  const typeDefs: { value: GenerationType; label: string }[] = [
    { value: 'words', label: 'Words' },
    { value: 'sentences', label: 'Sentences' },
    { value: 'paragraphs', label: 'Paragraphs' },
  ];

  const countLabel = (() => {
    if (type === 'words') return `word${count !== 1 ? 's' : ''}`;
    if (type === 'sentences') return `sentence${count !== 1 ? 's' : ''}`;
    return `paragraph${count !== 1 ? 's' : ''}`;
  })();

  const maxCount = type === 'words' ? 1000 : type === 'sentences' ? 200 : 50;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-3 mb-1">
          <Type className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Lorem Ipsum Generator</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Generate classic Lorem Ipsum placeholder text for your designs and mockups</p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Configuration */}
          <Card>
            <CardContent className="pt-5 space-y-5">
              {/* Type selector */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Generate Type</label>
                <div className="flex rounded-md border border-[hsla(0,0%,20%,1)] overflow-hidden w-fit">
                  {typeDefs.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setType(value)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${type === value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 max-w-[200px]">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Count <span className="text-gray-500 font-normal">({countLabel})</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={maxCount}
                    value={count}
                    onChange={e => setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Options row */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={startWithLorem}
                    onChange={e => setStartWithLorem(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Start with <span className="font-mono text-xs text-blue-400">"Lorem ipsum..."</span></span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Output:</span>
                  <div className="flex rounded-md border border-[hsla(0,0%,20%,1)] overflow-hidden">
                    <button
                      onClick={() => setFormat('plain')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${format === 'plain' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                    >
                      Plain Text
                    </button>
                    <button
                      onClick={() => setFormat('html')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${format === 'html' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                    >
                      HTML
                    </button>
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <Button onClick={generate} className="w-full sm:w-auto" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">Generated Text</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {wordCount} word{wordCount !== 1 ? 's' : ''} · {charCount} char{charCount !== 1 ? 's' : ''}
                  </span>
                  <Button onClick={handleCopy} disabled={!output} variant="outline" size="sm">
                    {copied ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
                  </Button>
                </div>
              </div>
              <Textarea
                value={output}
                readOnly
                rows={14}
                className="font-mono text-sm bg-gray-950 resize-none"
                placeholder="Click Generate to produce Lorem Ipsum text..."
              />
            </CardContent>
          </Card>

          {/* Quick amounts */}
          <Card>
            <CardContent className="pt-5">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">Quick Generate</label>
              <div className="flex flex-wrap gap-2">
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
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setType(t);
                      setCount(c);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
