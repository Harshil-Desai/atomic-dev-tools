'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { AlertCircle } from 'lucide-react';

// ─── Snowflake platforms ───────────────────────────────────────────────────────

interface Platform {
  label: string;
  epoch: bigint;
  timestampBits: number;
  layout: LayoutField[];
}

interface LayoutField {
  label: string;
  bits: number;
  color: string;
}

const PLATFORMS: Record<string, Platform> = {
  twitter: {
    label: 'Twitter / X',
    epoch: BigInt('1288834974657'),
    timestampBits: 41,
    layout: [
      { label: 'Unused', bits: 1, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
      { label: 'Timestamp (41 bits)', bits: 41, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      { label: 'Datacenter ID (5 bits)', bits: 5, color: 'bg-green-500/20 text-green-300 border-green-500/40' },
      { label: 'Worker ID (5 bits)', bits: 5, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
      { label: 'Sequence (12 bits)', bits: 12, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    ],
  },
  discord: {
    label: 'Discord',
    epoch: BigInt('1420070400000'),
    timestampBits: 42,
    layout: [
      { label: 'Timestamp (42 bits)', bits: 42, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      { label: 'Worker ID (5 bits)', bits: 5, color: 'bg-green-500/20 text-green-300 border-green-500/40' },
      { label: 'Process ID (5 bits)', bits: 5, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
      { label: 'Increment (12 bits)', bits: 12, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    ],
  },
  instagram: {
    label: 'Instagram',
    epoch: BigInt('1314220021721'),
    timestampBits: 41,
    layout: [
      { label: 'Timestamp (41 bits)', bits: 41, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      { label: 'Shard ID (13 bits)', bits: 13, color: 'bg-green-500/20 text-green-300 border-green-500/40' },
      { label: 'Sequence (10 bits)', bits: 10, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    ],
  },
  mastodon: {
    label: 'Mastodon',
    epoch: BigInt(0),
    timestampBits: 48,
    layout: [
      { label: 'Timestamp (48 bits)', bits: 48, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      { label: 'Sequence (16 bits)', bits: 16, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    ],
  },
};

// ─── decoder ──────────────────────────────────────────────────────────────────

interface DecodedSnowflake {
  rawId: bigint;
  timestamp: Date;
  timestampMs: bigint;
  fields: { label: string; value: bigint; bits: number; color: string }[];
  binary: string;
}

function decode(idStr: string, platform: Platform): DecodedSnowflake | null {
  const cleaned = idStr.trim().replace(/['"]/g, '');
  try {
    const id = BigInt(cleaned);
    if (id < BigInt(0)) return null;
    const binary = id.toString(2).padStart(64, '0');
    let offset = 0;
    const fields = platform.layout.map((f) => {
      const bits = binary.slice(offset, offset + f.bits);
      const value = BigInt('0b' + bits);
      offset += f.bits;
      return { label: f.label, value, bits: f.bits, color: f.color };
    });
    const tsField = fields.find((f) => f.label.toLowerCase().includes('timestamp'));
    const tsMs = tsField ? tsField.value + platform.epoch : BigInt(0);
    const timestamp = new Date(Number(tsMs));
    return { rawId: id, timestamp, timestampMs: tsMs, fields, binary };
  } catch {
    return null;
  }
}

const EXAMPLES: Record<string, string> = {
  twitter: '1541815603606036480',
  discord: '175928847299117063',
  instagram: '7390101695968927744',
  mastodon: '108131495937255386',
};

// ─── CSS vars ─────────────────────────────────────────────────────────────────

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#c792ea',
} as React.CSSProperties;

// ─── local Panel component ────────────────────────────────────────────────────

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

export default function SnowflakeDecoderPage() {
  const [input, setInput] = useState('');
  const [platformKey, setPlatformKey] = useState('twitter');
  const [customEpoch, setCustomEpoch] = useState('');

  const platform = PLATFORMS[platformKey];
  const effectivePlatform: Platform = platformKey === 'custom'
    ? { ...PLATFORMS.twitter, label: 'Custom', epoch: BigInt(parseInt(customEpoch, 10) || 0) }
    : platform;

  const decoded = input.trim() ? decode(input, effectivePlatform) : null;
  const parseError = input.trim() && !decoded ? 'Invalid Snowflake ID' : null;

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='backend'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Snowflake ID Decoder</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Decode Snowflake IDs to extract timestamp and machine information</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <Panel title='Platform & Input'>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Platform</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(PLATFORMS).map(([k, p]) => (
                  <button
                    key={k}
                    type='button'
                    onClick={() => { setPlatformKey(k); setInput(EXAMPLES[k] || ''); }}
                    style={platformKey === k ? { padding: '4px 10px', fontSize: 11, fontFamily: 'inherit', background: 'var(--bp-accent)', color: '#0a0e14', border: '1px solid var(--bp-accent)', cursor: 'pointer', fontWeight: 600 } : undefined}
                    className={platformKey === k ? undefined : 'bp-btn'}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type='button'
                  onClick={() => setPlatformKey('custom')}
                  style={platformKey === 'custom' ? { padding: '4px 10px', fontSize: 11, fontFamily: 'inherit', background: 'var(--bp-accent)', color: '#0a0e14', border: '1px solid var(--bp-accent)', cursor: 'pointer', fontWeight: 600 } : undefined}
                  className={platformKey === 'custom' ? undefined : 'bp-btn'}
                >
                  Custom
                </button>
              </div>
            </div>

            {platformKey === 'custom' && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custom Epoch (ms since Unix epoch)</div>
                <input
                  value={customEpoch}
                  onChange={(e) => setCustomEpoch(e.target.value)}
                  placeholder='e.g. 1288834974657'
                  style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div>
              <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Snowflake ID</div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Paste a Snowflake ID…'
                style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 14, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginTop: 4 }}>
                Example:{' '}
                <button
                  type='button'
                  onClick={() => setInput(EXAMPLES[platformKey] || EXAMPLES.twitter)}
                  style={{ background: 'none', border: 'none', color: 'var(--bp-accent)', fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  {EXAMPLES[platformKey] || EXAMPLES.twitter}
                </button>
              </div>
            </div>
          </div>
        </Panel>

        {parseError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.15)' }}>
            <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#fca5a5' }}>{parseError}</span>
          </div>
        )}

        {decoded && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Timestamp (UTC)', value: decoded.timestamp.toUTCString() },
                { label: 'ISO 8601', value: decoded.timestamp.toISOString() },
                { label: 'Unix ms', value: decoded.timestampMs.toString() },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: 'var(--bp-ink-mute)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                  <div style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>

            <Panel title='Field Breakdown'>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {decoded.fields.map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className={`rounded px-2 py-1 text-xs font-medium border ${f.color}`} style={{ width: 192, flexShrink: 0 }}>{f.label}</div>
                    <code style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '5px 10px', fontFamily: 'inherit', fontSize: 12, color: 'var(--bp-ink)' }}>{f.value.toString()}</code>
                    <BpCopyBtn text={f.value.toString()} label='COPY' />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title='64-bit Binary Layout'>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 10 }}>
                  {(() => {
                    const bin = decoded.binary;
                    let offset = 0;
                    return effectivePlatform.layout.map((f, fi) => {
                      const segment = bin.slice(offset, offset + f.bits);
                      offset += f.bits;
                      return segment.split('').map((bit, bi) => (
                        <div
                          key={`${fi}-${bi}`}
                          title={f.label}
                          className={`w-4 h-6 flex items-center justify-center text-[10px] font-mono font-bold rounded-sm ${bit === '1' ? f.color.replace('/20', '/40') : 'bg-[#1a1a1a] text-gray-700'}`}
                        >
                          {bit}
                        </div>
                      ));
                    });
                  })()}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {effectivePlatform.layout.map((f) => (
                    <span key={f.label} className={`text-xs px-2 py-0.5 rounded border ${f.color}`}>{f.label}</span>
                  ))}
                </div>
              </div>
            </Panel>
          </>
        )}

        <Panel title='About Snowflake IDs'>
          <div style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: '0 0 10px 0', lineHeight: 1.65 }}>
              Snowflake IDs are 64-bit integers that encode a millisecond timestamp, machine/worker identifier, and a per-machine sequence counter. This makes them sortable by creation time while remaining unique across distributed systems without coordination.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.entries(PLATFORMS).map(([k, p]) => (
                <div key={k} style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--bp-ink-mute)' }}>{p.label}: </span>
                  <span style={{ color: 'var(--bp-ink-faint)', fontFamily: 'inherit' }}>epoch +{p.epoch.toString().slice(-6)}…</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
