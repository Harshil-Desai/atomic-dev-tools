'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
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
    <BpToolStage cat='backend'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Snowflake ID Decoder</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Extract timestamp, worker ID, and sequence from distributed Snowflake IDs</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>

          <BpPanel title='Platform & Input'>
            <div className='space-y-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-2'>Platform</label>
                <div className='flex flex-wrap gap-2'>
                  {Object.entries(PLATFORMS).map(([k, p]) => (
                    <button key={k} type='button' onClick={() => { setPlatformKey(k); setInput(EXAMPLES[k] || ''); }}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${platformKey === k ? 'bg-blue-600 text-white' : 'bp-btn'}`}>
                      {p.label}
                    </button>
                  ))}
                  <button type='button' onClick={() => setPlatformKey('custom')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${platformKey === 'custom' ? 'bg-blue-600 text-white' : 'bp-btn'}`}>
                    Custom
                  </button>
                </div>
              </div>

              {platformKey === 'custom' && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Custom Epoch (ms since Unix epoch)</label>
                  <input value={customEpoch} onChange={(e) => setCustomEpoch(e.target.value)}
                    placeholder='e.g. 1288834974657' className='bp-input w-full font-mono' />
                </div>
              )}

              <div>
                <label className='block text-xs text-gray-500 mb-1'>Snowflake ID</label>
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder='Paste a Snowflake ID…' className='bp-input w-full font-mono text-lg' />
                <p className='text-xs text-gray-500 mt-1'>
                  Example: <button type='button' className='text-blue-400 hover:underline font-mono' onClick={() => setInput(EXAMPLES[platformKey] || EXAMPLES.twitter)}>
                    {EXAMPLES[platformKey] || EXAMPLES.twitter}
                  </button>
                </p>
              </div>
            </div>
          </BpPanel>

          {parseError && (
            <div className='flex items-center gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-4 h-4 text-red-400 shrink-0' />
              <span className='text-sm text-red-300'>{parseError}</span>
            </div>
          )}

          {decoded && (
            <>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                {[
                  { label: 'Timestamp (UTC)', value: decoded.timestamp.toUTCString() },
                  { label: 'ISO 8601', value: decoded.timestamp.toISOString() },
                  { label: 'Unix ms', value: decoded.timestampMs.toString() },
                ].map(({ label, value }) => (
                  <div key={label} className='bg-[#1C1C1C] border border-[hsla(0,0%,20%,1)] rounded-lg p-3'>
                    <p className='text-xs text-gray-500 mb-1'>{label}</p>
                    <p className='font-mono text-xs font-semibold text-white break-all'>{value}</p>
                  </div>
                ))}
              </div>

              <BpPanel title='Field Breakdown'>
                <div className='space-y-3'>
                  {decoded.fields.map((f) => (
                    <div key={f.label} className='flex items-center gap-3'>
                      <div className={`rounded px-2 py-1 text-xs font-medium border w-48 shrink-0 ${f.color}`}>{f.label}</div>
                      <code className='flex-1 bp-code-view px-3 py-1.5 font-mono text-sm text-gray-200'>{f.value.toString()}</code>
                      <BpCopyBtn text={f.value.toString()} label='COPY' />
                    </div>
                  ))}
                </div>
              </BpPanel>

              <BpPanel title='64-bit Binary Layout'>
                <div className='flex flex-wrap gap-0.5 mb-3'>
                  {(() => {
                    const bin = decoded.binary;
                    let offset = 0;
                    return effectivePlatform.layout.map((f, fi) => {
                      const segment = bin.slice(offset, offset + f.bits);
                      offset += f.bits;
                      return segment.split('').map((bit, bi) => (
                        <div key={`${fi}-${bi}`} title={f.label}
                          className={`w-4 h-6 flex items-center justify-center text-[10px] font-mono font-bold rounded-sm ${bit === '1' ? f.color.replace('/20', '/40') : 'bg-[#1a1a1a] text-gray-700'}`}>
                          {bit}
                        </div>
                      ));
                    });
                  })()}
                </div>
                <div className='flex flex-wrap gap-2'>
                  {effectivePlatform.layout.map((f) => (
                    <span key={f.label} className={`text-xs px-2 py-0.5 rounded border ${f.color}`}>{f.label}</span>
                  ))}
                </div>
              </BpPanel>
            </>
          )}

          <BpPanel title='About Snowflake IDs'>
            <p className='text-xs text-gray-400 mb-3'>Snowflake IDs are 64-bit integers that encode a millisecond timestamp, machine/worker identifier, and a per-machine sequence counter. This makes them sortable by creation time while remaining unique across distributed systems without coordination.</p>
            <div className='grid grid-cols-2 gap-2'>
              {Object.entries(PLATFORMS).map(([k, p]) => (
                <div key={k} className='text-xs'>
                  <span className='text-gray-400'>{p.label}: </span>
                  <span className='text-gray-500 font-mono'>epoch +{p.epoch.toString().slice(-6)}…</span>
                </div>
              ))}
            </div>
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
