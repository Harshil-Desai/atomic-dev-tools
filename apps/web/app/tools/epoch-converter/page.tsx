'use client';

import { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Clock } from 'lucide-react';

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

export default function EpochConverterPage() {
  const [currentEpoch, setCurrentEpoch] = useState<number>(Math.floor(Date.now() / 1000));
  const [humanInput, setHumanInput] = useState('');
  const [epochInput, setEpochInput] = useState('');
  const [humanOutput, setHumanOutput] = useState('');
  const [epochOutput, setEpochOutput] = useState('');
  const [timezone, setTimezone] = useState<'UTC' | 'Local'>('Local');

  useEffect(() => {
    const interval = setInterval(() => setCurrentEpoch(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const isSeconds = (timestamp: number): boolean => timestamp < 1000000000000;

  const formatDate = (date: Date, format: 'iso' | 'rfc2822' | 'local' | 'relative'): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    switch (format) {
      case 'iso': return date.toISOString();
      case 'rfc2822': return date.toUTCString();
      case 'local': return date.toLocaleString();
      case 'relative':
        if (Math.abs(diffSeconds) < 60) return diffSeconds === 0 ? 'now' : `${Math.abs(diffSeconds)} second${Math.abs(diffSeconds) !== 1 ? 's' : ''} ${diffSeconds > 0 ? 'from now' : 'ago'}`;
        if (Math.abs(diffMinutes) < 60) return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) !== 1 ? 's' : ''} ${diffMinutes > 0 ? 'from now' : 'ago'}`;
        if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ${diffHours > 0 ? 'from now' : 'ago'}`;
        if (Math.abs(diffDays) < 7) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ${diffDays > 0 ? 'from now' : 'ago'}`;
        return date.toLocaleDateString();
    }
  };

  const humanToEpoch = () => {
    if (!humanInput.trim()) { setEpochOutput(''); return; }
    try {
      const date = new Date(humanInput);
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      setEpochOutput(`${Math.floor(date.getTime() / 1000)} (seconds)\n${date.getTime()} (milliseconds)`);
    } catch { setEpochOutput('Invalid date format'); }
  };

  const epochToHuman = () => {
    if (!epochInput.trim()) { setHumanOutput(''); return; }
    try {
      const inputValue = parseFloat(epochInput.trim());
      if (isNaN(inputValue)) throw new Error('Invalid number');
      const date = isSeconds(inputValue) ? new Date(inputValue * 1000) : new Date(inputValue);
      if (isNaN(date.getTime())) throw new Error('Invalid timestamp');
      const displayDate = timezone === 'UTC' ? new Date(date.toISOString()) : date;
      const formats = { 'ISO 8601': formatDate(displayDate, 'iso'), 'RFC 2822': formatDate(displayDate, 'rfc2822'), 'Local': formatDate(displayDate, 'local'), 'Relative': formatDate(displayDate, 'relative') };
      setHumanOutput(Object.entries(formats).map(([label, value]) => `${label}: ${value}`).join('\n'));
    } catch { setHumanOutput('Invalid epoch timestamp'); }
  };

  const quickAction = (action: string) => {
    const now = Date.now();
    let timestamp: number;
    switch (action) {
      case 'now': timestamp = Math.floor(now / 1000); break;
      case '+1hour': timestamp = Math.floor((now + 3600000) / 1000); break;
      case '+1day': timestamp = Math.floor((now + 86400000) / 1000); break;
      case '+1week': timestamp = Math.floor((now + 604800000) / 1000); break;
      case 'today': { const t = new Date(); t.setHours(0, 0, 0, 0); timestamp = Math.floor(t.getTime() / 1000); break; }
      case 'yesterday': { const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0); timestamp = Math.floor(y.getTime() / 1000); break; }
      default: timestamp = Math.floor(now / 1000);
    }
    setEpochInput(timestamp.toString());
  };

  return (
    <div className='h-full flex flex-col overflow-hidden' data-cat='time' style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}>
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>Epoch Converter</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Convert between Unix timestamps and human-readable dates</p>
      </div>

      {/* Current epoch + quick actions bar */}
      <div className='p-2 sm:p-3 flex items-center gap-2 sm:gap-3 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0 flex-wrap' style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock style={{ width: 12, height: 12, color: 'var(--bp-accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>Now:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-accent)', letterSpacing: '0.05em' }}>{currentEpoch}</span>
          <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)' }}>{new Date(currentEpoch * 1000).toLocaleString()}</span>
          <BpCopyBtn text={currentEpoch.toString()} label='COPY' />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[['now', 'Now'], ['+1hour', '+1 hour'], ['+1day', '+1 day'], ['+1week', '+1 week'], ['today', 'Start of Today'], ['yesterday', 'Yesterday']].map(([action, label]) => (
            <button key={action} type='button' className='bp-btn min-h-10 px-3 py-2' onClick={() => quickAction(action)} style={{ fontSize: 10 }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className='grid grid-cols-1 lg:grid-cols-2' style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Human to Epoch */}
        <Panel title='Human to Epoch' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <label style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value as 'UTC' | 'Local')}
                style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '5px 8px', outline: 'none' }}
              >
                <option>Local</option>
                <option>UTC</option>
              </select>
            </div>
            <input
              type='datetime-local'
              value={humanInput}
              onChange={(e) => setHumanInput(e.target.value)}
              style={{ flex: 'none', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box', width: '100%' }}
            />
            {epochOutput && (
              <div style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Result</span>
                  <BpCopyBtn text={epochOutput} label='COPY' />
                </div>
                <pre style={{ fontSize: 12, color: 'var(--bp-ink)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{epochOutput}</pre>
              </div>
            )}
            {!epochOutput && !humanInput && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bp-ink-faint)', fontSize: 11 }}>
                Select a date and time above
              </div>
            )}
          </div>
          <div className='p-2 sm:p-3 flex items-center gap-2 sm:gap-3 flex-shrink-0' style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button type='button' className='bp-btn bp-btn-solid min-h-10 px-3 py-2' onClick={humanToEpoch} disabled={!humanInput.trim()} style={{ flex: 1, fontSize: 11 }}>CONVERT</button>
          </div>
        </Panel>

        {/* Epoch to Human */}
        <Panel title='Epoch to Human' style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <label style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Timezone</label>
              <select
                value={timezone}
                onChange={(e) => { setTimezone(e.target.value as 'UTC' | 'Local'); if (epochInput) epochToHuman(); }}
                style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '5px 8px', outline: 'none' }}
              >
                <option>Local</option>
                <option>UTC</option>
              </select>
            </div>
            <input
              type='number'
              placeholder='Enter epoch timestamp (seconds or ms)'
              value={epochInput}
              onChange={(e) => { setEpochInput(e.target.value); if (e.target.value.trim()) setTimeout(() => epochToHuman(), 300); }}
              style={{ flex: 'none', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box', width: '100%' }}
            />
            {humanOutput && (
              <div style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Result</span>
                  <BpCopyBtn text={humanOutput} label='COPY' />
                </div>
                <pre style={{ fontSize: 12, color: 'var(--bp-ink)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{humanOutput}</pre>
              </div>
            )}
            {!humanOutput && !epochInput && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bp-ink-faint)', fontSize: 11 }}>
                Enter an epoch timestamp above
              </div>
            )}
          </div>
          <div className='p-2 sm:p-3 flex items-center gap-2 sm:gap-3 flex-shrink-0' style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
            <button type='button' className='bp-btn bp-btn-solid min-h-10 px-3 py-2' onClick={epochToHuman} disabled={!epochInput.trim()} style={{ flex: 1, fontSize: 11 }}>CONVERT</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
