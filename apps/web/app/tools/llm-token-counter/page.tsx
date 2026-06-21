'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
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
  'gpt-4o': { label: 'GPT-4o', contextWindow: 128000, inputPricePer1M: 2.50, outputPricePer1M: 10.00, tokenizer: 'cl100k_base' },
  'gpt-4o-mini': { label: 'GPT-4o mini', contextWindow: 128000, inputPricePer1M: 0.15, outputPricePer1M: 0.60, tokenizer: 'cl100k_base' },
  'gpt-4-turbo': { label: 'GPT-4 Turbo', contextWindow: 128000, inputPricePer1M: 10.00, outputPricePer1M: 30.00, tokenizer: 'cl100k_base' },
  'gpt-3.5-turbo': { label: 'GPT-3.5 Turbo', contextWindow: 16385, inputPricePer1M: 0.50, outputPricePer1M: 1.50, tokenizer: 'cl100k_base' },
  'claude-3-5-sonnet': { label: 'Claude 3.5 Sonnet', contextWindow: 200000, inputPricePer1M: 3.00, outputPricePer1M: 15.00, tokenizer: 'cl100k_base' },
  'claude-3-haiku': { label: 'Claude 3 Haiku', contextWindow: 200000, inputPricePer1M: 0.25, outputPricePer1M: 1.25, tokenizer: 'cl100k_base' },
};

// ─── chunking ─────────────────────────────────────────────────────────────────

interface Chunk { index: number; text: string; tokenCount: number; startToken: number; }

function chunkText(text: string, chunkSize: number, overlap: number): Chunk[] {
  if (!text.trim()) return [];
  const tokens = encode(text);
  const chunks: Chunk[] = [];
  let start = 0; let idx = 0;
  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    chunks.push({ index: idx++, text: decode(tokens.slice(start, end)), tokenCount: end - start, startToken: start });
    if (end === tokens.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

const TOKEN_COLORS = [
  'bg-blue-500/20 text-blue-200', 'bg-purple-500/20 text-purple-200', 'bg-green-500/20 text-green-200',
  'bg-yellow-500/20 text-yellow-200', 'bg-pink-500/20 text-pink-200', 'bg-cyan-500/20 text-cyan-200',
  'bg-orange-500/20 text-orange-200', 'bg-red-500/20 text-red-200',
];

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This sentence is commonly used as a typing test because it contains every letter of the English alphabet. Tokenizers break text into subword units, and understanding token counts helps estimate API costs and context limits.`;

// ─── css vars ─────────────────────────────────────────────────────────────────

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#e879f9',
} as React.CSSProperties;

// ─── panel component ──────────────────────────────────────────────────────────

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

// ─── component ────────────────────────────────────────────────────────────────

export default function LLMTokenCounterPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [modelKey, setModelKey] = useState('gpt-4o');
  const [chunkSize, setChunkSize] = useState(512);
  const [overlap, setOverlap] = useState(50);
  const [showChunks, setShowChunks] = useState(false);
  const [showTokenViz, setShowTokenViz] = useState(false);

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
    for (const t of tokens) tokenStrings.push(decode([t]) || `[${t}]`);
  }

  const statColor = contextUsedPct > 90 ? '#f87171' : contextUsedPct > 70 ? '#facc15' : '#4ade80';
  const barColor = contextUsedPct > 90 ? '#ef4444' : contextUsedPct > 70 ? '#eab308' : '#22c55e';

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='ai'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* header */}
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>LLM Token Counter</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Count tokens using cl100k_base, estimate API costs, and preview text chunks — all in-browser</p>
      </div>

      {/* content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* model selector */}
        <Panel title='Model' style={{ margin: 16, marginBottom: 0 }}>
          <div className='p-2 sm:p-3' style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(MODELS).map(([key, m]) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setModelKey(key)}
                  className={modelKey === key ? 'min-h-10 px-3 py-2' : 'bp-btn min-h-10 px-3 py-2'}
                  style={modelKey === key ? {
                    fontSize: 12,
                    fontWeight: 500,
                    background: 'var(--bp-accent)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  } : { fontSize: 12 }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>
              Context window: <span style={{ color: 'var(--bp-ink)', fontFamily: 'inherit' }}>{model.contextWindow.toLocaleString()} tokens</span>
              {' · '}Input: <span style={{ color: 'var(--bp-ink)', fontFamily: 'inherit' }}>${model.inputPricePer1M}/1M</span>
              {' · '}Output: <span style={{ color: 'var(--bp-ink)', fontFamily: 'inherit' }}>${model.outputPricePer1M}/1M</span>
            </p>
          </div>
        </Panel>

        {/* input text */}
        <Panel title='Input Text' style={{ margin: 16, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <BpCopyBtn text={text} label='COPY' />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Paste your text here…'
            rows={10}
            style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0, color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65, minHeight: 200 }}
          />
        </Panel>

        {/* stats */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' style={{ margin: 16, marginBottom: 0, gap: 8 }}>
          {[
            { label: 'Tokens', value: tokenCount.toLocaleString(), highlight: true },
            { label: 'Characters', value: charCount.toLocaleString() },
            { label: 'Words', value: wordCount.toLocaleString() },
            { label: 'Est. Input Cost', value: `$${inputCost < 0.001 ? inputCost.toFixed(6) : inputCost.toFixed(4)}` },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ border: '1px solid var(--bp-border)', background: 'var(--bp-surface)', padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
              <p style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 700, margin: 0, color: highlight ? '#fff' : 'var(--bp-ink)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* context window usage */}
        {tokenCount > 0 && (
          <Panel title='Context Window Usage' style={{ margin: 16, marginBottom: 0 }}>
            <div className='p-2 sm:p-3' style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>Usage</span>
                <span style={{ fontSize: 12, fontFamily: 'inherit', fontWeight: 700, color: statColor }}>
                  {tokenCount.toLocaleString()} / {model.contextWindow.toLocaleString()} ({contextUsedPct.toFixed(1)}%)
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--bp-bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.3s', width: `${contextUsedPct}%`, background: barColor }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>{(model.contextWindow - tokenCount).toLocaleString()} tokens remaining</p>
            </div>
          </Panel>
        )}

        {/* token visualization */}
        {tokenCount > 0 && tokenCount <= 2000 && (
          <Panel title='Token Visualization' style={{ margin: 16, marginBottom: 0 }}>
            <div className='p-2 sm:p-3 flex items-center gap-2 sm:gap-3 flex-shrink-0' style={{ borderBottom: '1px dashed var(--bp-border-str)' }}>
              <button type='button' className='bp-btn min-h-10 px-3 py-2' style={{ fontSize: 11 }} onClick={() => setShowTokenViz((v) => !v)}>
                {showTokenViz ? 'Hide' : 'Show'} tokens
              </button>
            </div>
            {showTokenViz && (
              <div className='p-2 sm:p-3' style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className='flex flex-wrap gap-0.5 max-h-48 overflow-auto'>
                  {tokens.map((t, i) => (
                    <span key={i} title={`Token ID: ${t}`} className={`inline-block text-xs font-mono px-1 py-0.5 rounded ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}>
                      {tokenStrings[i] ?? String(t)}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Each colored block = one token. Hover to see token ID.</p>
              </div>
            )}
          </Panel>
        )}
        {tokenCount > 2000 && (
          <Panel title='Token Visualization' style={{ margin: 16, marginBottom: 0 }}>
            <div className='p-2 sm:p-3' style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Token visualization is limited to texts under 2,000 tokens to keep the UI responsive.</p>
            </div>
          </Panel>
        )}

        {/* text chunking */}
        <Panel title='Text Chunking' style={{ margin: 16, marginBottom: 16 }}>
          <div className='p-2 sm:p-3 flex items-center gap-2 sm:gap-3 flex-shrink-0' style={{ borderBottom: '1px dashed var(--bp-border-str)' }}>
            <button
              type='button'
              className='bp-btn min-h-10 px-3 py-2'
              style={{ fontSize: 11 }}
              onClick={() => setShowChunks((v) => !v)}
              disabled={!text.trim()}
            >
              {showChunks ? 'Hide' : 'Preview'} chunks
            </button>
          </div>
          <div className='p-2 sm:p-3' style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className='grid grid-cols-1 lg:grid-cols-2' style={{ gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Chunk size (tokens)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[256, 512, 1024, 2048].map((n) => (
                    <button
                      key={n}
                      type='button'
                      onClick={() => setChunkSize(n)}
                      className={chunkSize === n ? '' : 'bp-btn'}
                      style={chunkSize === n ? {
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 500,
                        background: 'var(--bp-accent)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      } : { fontSize: 11 }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Overlap (tokens)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[0, 50, 100, 200].map((n) => (
                    <button
                      key={n}
                      type='button'
                      onClick={() => setOverlap(n)}
                      className={overlap === n ? '' : 'bp-btn'}
                      style={overlap === n ? {
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 500,
                        background: 'var(--bp-accent)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      } : { fontSize: 11 }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {showChunks && chunks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>{chunks.length} chunk{chunks.length !== 1 ? 's' : ''} total</p>
                {chunks.map((chunk) => (
                  <div key={chunk.index} style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>Chunk {chunk.index + 1}</span>
                      <span style={{ fontSize: 11, fontFamily: 'inherit', color: 'var(--bp-accent)' }}>{chunk.tokenCount} tokens (starts at {chunk.startToken})</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0, fontFamily: 'inherit', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{chunk.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

      </div>
    </div>
  );
}
