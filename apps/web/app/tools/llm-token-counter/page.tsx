'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { Bot, Copy, Check } from 'lucide-react';
import { encode, decode } from 'gpt-tokenizer';

// ─── model definitions ────────────────────────────────────────────────────────

interface ModelDef {
  label: string;
  contextWindow: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
  tokenizer: 'cl100k_base';
}

const MODELS: Record<string, ModelDef> = {
  'gpt-4o': {
    label: 'GPT-4o',
    contextWindow: 128000,
    inputPricePer1M: 2.50,
    outputPricePer1M: 10.00,
    tokenizer: 'cl100k_base',
  },
  'gpt-4o-mini': {
    label: 'GPT-4o mini',
    contextWindow: 128000,
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
    tokenizer: 'cl100k_base',
  },
  'gpt-4-turbo': {
    label: 'GPT-4 Turbo',
    contextWindow: 128000,
    inputPricePer1M: 10.00,
    outputPricePer1M: 30.00,
    tokenizer: 'cl100k_base',
  },
  'gpt-3.5-turbo': {
    label: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    inputPricePer1M: 0.50,
    outputPricePer1M: 1.50,
    tokenizer: 'cl100k_base',
  },
  'claude-3-5-sonnet': {
    label: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    tokenizer: 'cl100k_base',
  },
  'claude-3-haiku': {
    label: 'Claude 3 Haiku',
    contextWindow: 200000,
    inputPricePer1M: 0.25,
    outputPricePer1M: 1.25,
    tokenizer: 'cl100k_base',
  },
};

// ─── chunking ─────────────────────────────────────────────────────────────────

interface Chunk {
  index: number;
  text: string;
  tokenCount: number;
  startToken: number;
}

function chunkText(text: string, chunkSize: number, overlap: number): Chunk[] {
  if (!text.trim()) return [];
  const tokens = encode(text);
  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;

  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    chunks.push({
      index: idx++,
      text: decode(tokens.slice(start, end)),
      tokenCount: end - start,
      startToken: start,
    });
    if (end === tokens.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

// ─── token highlight ──────────────────────────────────────────────────────────

const TOKEN_COLORS = [
  'bg-blue-500/20 text-blue-200',
  'bg-purple-500/20 text-purple-200',
  'bg-green-500/20 text-green-200',
  'bg-yellow-500/20 text-yellow-200',
  'bg-pink-500/20 text-pink-200',
  'bg-cyan-500/20 text-cyan-200',
  'bg-orange-500/20 text-orange-200',
  'bg-red-500/20 text-red-200',
];

// ─── component ────────────────────────────────────────────────────────────────

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This sentence is commonly used as a typing test because it contains every letter of the English alphabet. Tokenizers break text into subword units, and understanding token counts helps estimate API costs and context limits.`;

export default function LLMTokenCounterPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [modelKey, setModelKey] = useState('gpt-4o');
  const [chunkSize, setChunkSize] = useState(512);
  const [overlap, setOverlap] = useState(50);
  const [showChunks, setShowChunks] = useState(false);
  const [showTokenViz, setShowTokenViz] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const model = MODELS[modelKey];
  const tokens = text ? encode(text) : [];
  const tokenCount = tokens.length;
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const contextUsedPct = Math.min(100, (tokenCount / model.contextWindow) * 100);
  const inputCost = (tokenCount / 1_000_000) * model.inputPricePer1M;

  const chunks = showChunks ? chunkText(text, chunkSize, overlap) : [];

  const tokenStrings: string[] = [];
  if (showTokenViz && tokens.length > 0 && tokens.length <= 2000) {
    for (const t of tokens) {
      tokenStrings.push(decode([t]) || `[${t}]`);
    }
  }

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const statColor = contextUsedPct > 90 ? 'text-red-400' : contextUsedPct > 70 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>LLM Token Counter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Count tokens using cl100k_base, estimate API costs, and preview text chunks — all in-browser</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Model selector */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <label className='block text-sm font-medium text-gray-300'>Model</label>
              <div className='flex flex-wrap gap-2'>
                {Object.entries(MODELS).map(([key, m]) => (
                  <Button key={key} size='sm' variant={modelKey === key ? 'default' : 'outline'}
                    onClick={() => setModelKey(key)}>
                    {m.label}
                  </Button>
                ))}
              </div>
              <p className='text-xs text-gray-500'>
                Context window: <span className='text-gray-300 font-mono'>{model.contextWindow.toLocaleString()} tokens</span>
                {' · '}Input: <span className='text-gray-300 font-mono'>${model.inputPricePer1M}/1M tokens</span>
                {' · '}Output: <span className='text-gray-300 font-mono'>${model.outputPricePer1M}/1M tokens</span>
              </p>
            </CardContent>
          </Card>

          {/* Text input */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='block text-sm font-medium text-gray-300'>Input Text</label>
                <Button variant='outline' size='sm' onClick={() => handleCopy(text, 'text')}>
                  {copied === 'text' ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                </Button>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='Paste your text here…'
                rows={10}
                className='font-mono text-sm'
              />
            </CardContent>
          </Card>

          {/* Stats */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            {[
              { label: 'Tokens', value: tokenCount.toLocaleString(), highlight: true },
              { label: 'Characters', value: charCount.toLocaleString() },
              { label: 'Words', value: wordCount.toLocaleString() },
              { label: 'Est. Input Cost', value: `$${inputCost < 0.001 ? inputCost.toFixed(6) : inputCost.toFixed(4)}` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className='bg-[#1C1C1C] border border-[hsla(0,0%,20%,1)] rounded-lg p-3'>
                <p className='text-xs text-gray-500 mb-1'>{label}</p>
                <p className={`font-mono text-lg font-bold ${highlight ? 'text-white' : 'text-gray-300'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Context bar */}
          {tokenCount > 0 && (
            <Card>
              <CardContent className='pt-6 space-y-2'>
                <div className='flex items-center justify-between'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Context Window Usage</p>
                  <span className={`text-sm font-mono font-bold ${statColor}`}>
                    {tokenCount.toLocaleString()} / {model.contextWindow.toLocaleString()} ({contextUsedPct.toFixed(1)}%)
                  </span>
                </div>
                <div className='h-3 bg-[#121212] rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      contextUsedPct > 90 ? 'bg-red-500' : contextUsedPct > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${contextUsedPct}%` }}
                  />
                </div>
                <p className='text-xs text-gray-500'>
                  {(model.contextWindow - tokenCount).toLocaleString()} tokens remaining
                </p>
              </CardContent>
            </Card>
          )}

          {/* Token viz toggle */}
          {tokenCount > 0 && tokenCount <= 2000 && (
            <Card>
              <CardContent className='pt-6 space-y-3'>
                <div className='flex items-center justify-between'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Token Visualization</p>
                  <Button size='sm' variant='outline' onClick={() => setShowTokenViz((v) => !v)}>
                    {showTokenViz ? 'Hide' : 'Show'} tokens
                  </Button>
                </div>
                {showTokenViz && (
                  <div className='flex flex-wrap gap-0.5 max-h-48 overflow-auto'>
                    {tokens.map((t, i) => (
                      <span
                        key={i}
                        title={`Token ID: ${t}`}
                        className={`inline-block text-xs font-mono px-1 py-0.5 rounded ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}
                      >
                        {tokenStrings[i] ?? String(t)}
                      </span>
                    ))}
                  </div>
                )}
                {showTokenViz && (
                  <p className='text-xs text-gray-500'>Each colored block = one token. Hover to see token ID.</p>
                )}
              </CardContent>
            </Card>
          )}
          {tokenCount > 2000 && (
            <Card>
              <CardContent className='pt-6'>
                <p className='text-xs text-gray-500'>Token visualization is limited to texts under 2,000 tokens to keep the UI responsive.</p>
              </CardContent>
            </Card>
          )}

          {/* Chunking */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='flex items-center justify-between'>
                <p className='text-xs text-gray-500 uppercase tracking-wide'>Text Chunking</p>
                <Button size='sm' variant='outline' onClick={() => setShowChunks((v) => !v)} disabled={!text.trim()}>
                  {showChunks ? 'Hide' : 'Preview'} chunks
                </Button>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs text-gray-400 mb-1'>Chunk size (tokens)</label>
                  <div className='flex gap-2 flex-wrap'>
                    {[256, 512, 1024, 2048].map((n) => (
                      <Button key={n} size='sm' variant={chunkSize === n ? 'default' : 'outline'} onClick={() => setChunkSize(n)}>
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className='block text-xs text-gray-400 mb-1'>Overlap (tokens)</label>
                  <div className='flex gap-2 flex-wrap'>
                    {[0, 50, 100, 200].map((n) => (
                      <Button key={n} size='sm' variant={overlap === n ? 'default' : 'outline'} onClick={() => setOverlap(n)}>
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              {showChunks && chunks.length > 0 && (
                <div className='space-y-2 max-h-72 overflow-auto'>
                  <p className='text-xs text-gray-500'>{chunks.length} chunk{chunks.length !== 1 ? 's' : ''} total</p>
                  {chunks.map((chunk) => (
                    <div key={chunk.index} className='bg-[#121212] rounded-md p-3 border border-[hsla(0,0%,15%,1)]'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs text-gray-500'>Chunk {chunk.index + 1}</span>
                        <span className='text-xs font-mono text-blue-400'>{chunk.tokenCount} tokens (starts at {chunk.startToken})</span>
                      </div>
                      <p className='text-xs text-gray-400 line-clamp-2 font-mono'>{chunk.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
