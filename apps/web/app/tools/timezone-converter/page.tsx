'use client';

import React, { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { Globe } from 'lucide-react';

const TIMEZONES = ['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','America/Honolulu','America/Toronto','America/Vancouver','America/Mexico_City','America/Bogota','America/Lima','America/Santiago','America/Sao_Paulo','America/Argentina/Buenos_Aires','America/Caracas','America/Halifax','Europe/London','Europe/Dublin','Europe/Lisbon','Europe/Paris','Europe/Berlin','Europe/Amsterdam','Europe/Madrid','Europe/Rome','Europe/Vienna','Europe/Warsaw','Europe/Prague','Europe/Budapest','Europe/Stockholm','Europe/Oslo','Europe/Copenhagen','Europe/Helsinki','Europe/Athens','Europe/Istanbul','Europe/Moscow','Africa/Cairo','Africa/Johannesburg','Africa/Lagos','Africa/Nairobi','Africa/Casablanca','Asia/Dubai','Asia/Riyadh','Asia/Tehran','Asia/Karachi','Asia/Kolkata','Asia/Colombo','Asia/Dhaka','Asia/Kathmandu','Asia/Almaty','Asia/Bangkok','Asia/Ho_Chi_Minh','Asia/Jakarta','Asia/Singapore','Asia/Kuala_Lumpur','Asia/Manila','Asia/Hong_Kong','Asia/Shanghai','Asia/Taipei','Asia/Seoul','Asia/Tokyo','Australia/Perth','Australia/Darwin','Australia/Adelaide','Australia/Brisbane','Australia/Sydney','Australia/Melbourne','Pacific/Auckland','Pacific/Fiji','Pacific/Honolulu','Pacific/Guam'];

const WORLD_CLOCK_CITIES = [
  { label: 'UTC', zone: 'UTC' },
  { label: 'New York', zone: 'America/New_York' },
  { label: 'London', zone: 'Europe/London' },
  { label: 'Paris', zone: 'Europe/Paris' },
  { label: 'Dubai', zone: 'Asia/Dubai' },
  { label: 'Mumbai', zone: 'Asia/Kolkata' },
  { label: 'Singapore', zone: 'Asia/Singapore' },
  { label: 'Tokyo', zone: 'Asia/Tokyo' },
];

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

function getUtcOffset(zone: string, date: Date): string {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: zone }));
    const diff = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    const sign = diff >= 0 ? '+' : '-';
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 60).toString().padStart(2, '0');
    const m = (abs % 60).toString().padStart(2, '0');
    return m === '00' ? `UTC${sign}${parseInt(h, 10)}` : `UTC${sign}${parseInt(h, 10)}:${m}`;
  } catch { return 'UTC?'; }
}

function formatInZone(date: Date, zone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
  } catch { return 'Invalid timezone'; }
}

function formatWorldClock(date: Date, zone: string): string {
  try { return new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date); } catch { return '--:--:--'; }
}

function formatWorldClockDate(date: Date, zone: string): string {
  try { return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' }).format(date); } catch { return ''; }
}

function localDatetimeToUtc(localStr: string, sourceZone: string): Date | null {
  if (!localStr) return null;
  try {
    const [datePart, timePart] = localStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const rendered = new Intl.DateTimeFormat('en-US', { timeZone: sourceZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(approxUtc);
    const rMap: Record<string, number> = {};
    for (const p of rendered) { if (p.type !== 'literal') rMap[p.type] = parseInt(p.value, 10); }
    const renderedUtcEquiv = new Date(Date.UTC(rMap.year, rMap.month - 1, rMap.day, rMap.hour, rMap.minute, rMap.second));
    return new Date(approxUtc.getTime() - (renderedUtcEquiv.getTime() - approxUtc.getTime()));
  } catch { return null; }
}

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

export default function TimezoneConverterPage() {
  const now = new Date();
  const localDatetime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [datetimeInput, setDatetimeInput] = useState(localDatetime);
  const [sourceZone, setSourceZone] = useState('America/New_York');
  const [targetZone, setTargetZone] = useState('Asia/Kolkata');
  const [tzSearch, setTzSearch] = useState<Record<string, string>>({ source: '', target: '' });
  const [converted, setConverted] = useState('');
  const [sourceOffset, setSourceOffset] = useState('');
  const [targetOffset, setTargetOffset] = useState('');
  const [worldClock, setWorldClock] = useState<Record<string, string>>({});
  const [worldClockDates, setWorldClockDates] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const filteredSource = TIMEZONES.filter(z => z.toLowerCase().includes((tzSearch.source || '').toLowerCase()));
  const filteredTarget = TIMEZONES.filter(z => z.toLowerCase().includes((tzSearch.target || '').toLowerCase()));

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const times: Record<string, string> = {};
      const dates: Record<string, string> = {};
      for (const city of WORLD_CLOCK_CITIES) { times[city.zone] = formatWorldClock(now, city.zone); dates[city.zone] = formatWorldClockDate(now, city.zone); }
      setWorldClock(times); setWorldClockDates(dates);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConvert = () => {
    setError('');
    const utc = localDatetimeToUtc(datetimeInput, sourceZone);
    if (!utc) { setError('Could not parse the input date/time'); setConverted(''); return; }
    setConverted(formatInZone(utc, targetZone));
    setSourceOffset(getUtcOffset(sourceZone, utc));
    setTargetOffset(getUtcOffset(targetZone, utc));
  };

  const ZoneSelect = ({ value, onChange, search, onSearchChange, filtered }: { value: string; onChange: (v: string) => void; search: string; onSearchChange: (v: string) => void; filtered: string[]; }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        placeholder='Search timezone...'
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '5px 8px', outline: 'none', boxSizing: 'border-box', width: '100%' }}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={6}
        style={{ background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 11, padding: '5px 8px', outline: 'none', width: '100%' }}
      >
        {filtered.map(z => <option key={z} value={z}>{z}</option>)}
      </select>
      <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0 }}>
        Selected: <span style={{ color: 'var(--bp-accent)' }}>{value}</span>
      </p>
    </div>
  );

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='time'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Timezone Converter</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Convert datetimes across timezones with a world clock reference</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top: Conversion — 2-column split */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
          {/* Left: Inputs */}
          <Panel title='Conversion — Input' style={{ borderRight: 0, borderBottom: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 5 }}>Date &amp; Time</label>
                <input
                  type='datetime-local'
                  value={datetimeInput}
                  onChange={(e) => setDatetimeInput(e.target.value)}
                  style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box', width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 5 }}>Source Timezone</label>
                  <ZoneSelect
                    value={sourceZone}
                    onChange={setSourceZone}
                    search={tzSearch.source || ''}
                    onSearchChange={(v) => setTzSearch(s => ({ ...s, source: v }))}
                    filtered={filteredSource}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 5 }}>Target Timezone</label>
                  <ZoneSelect
                    value={targetZone}
                    onChange={setTargetZone}
                    search={tzSearch.target || ''}
                    onSearchChange={(v) => setTzSearch(s => ({ ...s, target: v }))}
                    filtered={filteredTarget}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
              <button type='button' className='bp-btn bp-btn-solid' onClick={handleConvert} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe style={{ width: 14, height: 14 }} />
                CONVERT
              </button>
            </div>
          </Panel>

          {/* Right: Output */}
          <Panel title='Conversion — Output' style={{ borderBottom: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {error && (
                <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>
              )}
              {converted && (
                <div style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: 0, marginBottom: 4 }}>Converted time in {targetZone}</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0, fontFamily: 'inherit' }}>{converted}</p>
                    </div>
                    <BpCopyBtn text={converted} label='COPY' />
                  </div>
                  <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
                    <div>
                      <span style={{ color: 'var(--bp-ink-mute)' }}>Source: </span>
                      <span style={{ color: 'var(--bp-accent)', fontFamily: 'inherit' }}>{sourceOffset}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--bp-ink-mute)' }}>Target: </span>
                      <span style={{ color: '#4ade80', fontFamily: 'inherit' }}>{targetOffset}</span>
                    </div>
                  </div>
                </div>
              )}
              {!converted && !error && (
                <p style={{ fontSize: 11, color: 'var(--bp-ink-faint)', margin: 0 }}>Select a source timezone, target timezone, and date/time, then click CONVERT.</p>
              )}
            </div>
          </Panel>
        </div>

        {/* Bottom: World Clock */}
        <Panel title='World Clock' style={{ flexShrink: 0, borderTop: 0 }}>
          <div style={{ overflowY: 'auto', padding: '10px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {WORLD_CLOCK_CITIES.map((city) => (
                <div key={city.zone} style={{ background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '8px 10px' }}>
                  <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', margin: 0, marginBottom: 4 }}>{city.label}</p>
                  <p style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{worldClock[city.zone] || '--:--:--'}</p>
                  <p style={{ fontSize: 9, color: 'var(--bp-ink-faint)', margin: 0, marginTop: 2 }}>{worldClockDates[city.zone] || ''}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
