'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Fingerprint, Download } from 'lucide-react';

type UuidVersion = 'v4' | 'v7';

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#61dafb',
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

export default function UuidGeneratorPage() {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);
  const [uppercase, setUppercase] = useState(false);
  const [withHyphens, setWithHyphens] = useState(true);
  const [withBraces, setWithBraces] = useState(false);

  const generateV4 = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16); });
  };

  const generateV7 = (): string => {
    const now = Date.now();
    const timestamp = now.toString(16).padStart(12, '0');
    const randomPart1 = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    const randomPart2 = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    const randomPart3 = Math.floor(Math.random() * 0x100000000000).toString(16).padStart(12, '0');
    const versionAndVariant = '7' + (Math.floor(Math.random() * 4) | 0x8).toString(16);
    const uuid = `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-${versionAndVariant}${randomPart1}-${(Math.floor(Math.random() * 4) | 0x8).toString(16)}${randomPart2}-${randomPart3}`;
    return uuid.substring(0, 36);
  };

  const formatUuid = (uuid: string): string => {
    let formatted = uuid;
    if (!withHyphens) formatted = formatted.replace(/-/g, '');
    formatted = uppercase ? formatted.toUpperCase() : formatted.toLowerCase();
    if (withBraces) formatted = `{${formatted}}`;
    return formatted;
  };

  const generateUuids = () => {
    const generated: string[] = [];
    for (let i = 0; i < Math.min(count, 1000); i++) generated.push(formatUuid(version === 'v4' ? generateV4() : generateV7()));
    setUuids(generated);
  };

  const downloadAsTxt = () => {
    const blob = new Blob([uuids.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `uuids-${version}-${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='h-full flex flex-col overflow-hidden' data-cat='time' style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}>
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>UUID Generator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Generate RFC-compliant v4 and v7 UUIDs in bulk</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>
        {/* Left: Configuration */}
        <Panel title='Configuration' style={{ borderRight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>UUID Version</label>
              <select value={version} onChange={(e) => setVersion(e.target.value as UuidVersion)} style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '5px 8px', outline: 'none' }}>
                <option value='v4'>UUID v4 (Random)</option>
                <option value='v7'>UUID v7 (Timestamp-based)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Count (1–1000)</label>
              <input
                type='number'
                min='1'
                max='1000'
                value={count}
                onChange={(e) => setCount(Math.min(Math.max(1, parseInt(e.target.value) || 1), 1000))}
                style={{ width: 96, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 8 }}>Formatting</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([['uppercase', uppercase, setUppercase, 'Uppercase'], ['withHyphens', withHyphens, setWithHyphens, 'With Hyphens'], ['withBraces', withBraces, setWithBraces, 'With Braces {}']] as [string, boolean, (v: boolean) => void, string][]).map(([key, val, set, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type='checkbox'
                      checked={val}
                      onChange={(e) => set(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: 'var(--bp-accent)' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--bp-ink)' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button type='button' className='bp-btn bp-btn-solid' onClick={generateUuids} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Fingerprint style={{ width: 14, height: 14 }} />
              GENERATE UUIDs
            </button>
          </div>
        </Panel>

        {/* Right: Output */}
        <Panel title='Generated UUIDs' meta={uuids.length > 0 ? `${uuids.length} UUIDs` : undefined}>
          {uuids.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px dashed var(--bp-border-str)', background: 'var(--bp-surface)', flexShrink: 0 }}>
                <BpCopyBtn text={uuids.join('\n')} label='COPY ALL' />
                <BpCopyBtn text={JSON.stringify(uuids, null, 2)} label='COPY AS ARRAY' />
                <BpCopyBtn text={uuids.join(',')} label='COPY AS CSV' />
                <button type='button' className='bp-btn' onClick={downloadAsTxt} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Download style={{ width: 12, height: 12 }} />
                  DOWNLOAD .TXT
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
                {uuids.map((uuid, index) => (
                  <div
                    key={index}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 10px', borderRadius: 2 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bp-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <code style={{ fontSize: 12, fontFamily: 'inherit', color: 'var(--bp-ink)', letterSpacing: '0.03em' }}>{uuid}</code>
                    <div style={{ flexShrink: 0, marginLeft: 8 }}>
                      <BpCopyBtn text={uuid} label='COPY' />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Fingerprint style={{ width: 40, height: 40, opacity: 0.3, color: 'var(--bp-ink-faint)' }} />
              <p style={{ fontSize: 12, color: 'var(--bp-ink-mute)', margin: 0 }}>Configure settings and click "Generate UUIDs" to get started</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
