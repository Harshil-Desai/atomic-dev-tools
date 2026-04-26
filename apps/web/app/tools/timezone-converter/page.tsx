'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';
import { Globe, Copy, Check } from 'lucide-react';

// ─── data ─────────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Caracas',
  'America/Halifax',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Casablanca',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Tehran',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Dhaka',
  'Asia/Kathmandu',
  'Asia/Almaty',
  'Asia/Bangkok',
  'Asia/Ho_Chi_Minh',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Australia/Perth',
  'Australia/Darwin',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Honolulu',
  'Pacific/Guam',
];

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

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  } catch {
    return 'UTC?';
  }
}

function formatInZone(date: Date, zone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return 'Invalid timezone';
  }
}

function formatWorldClock(date: Date, zone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '--:--:--';
  }
}

function formatWorldClockDate(date: Date, zone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

function localDatetimeToUtc(localStr: string, sourceZone: string): Date | null {
  if (!localStr) return null;
  try {
    // localStr is "YYYY-MM-DDTHH:mm" (datetime-local value, treated as if it's in sourceZone)
    const [datePart, timePart] = localStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    // Find the UTC time that corresponds to this local time in sourceZone
    // Strategy: binary search / iterate using Intl
    // Simple approach: construct an approximate UTC time then correct it
    const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));

    // Get what sourceZone renders for approxUtc
    const rendered = new Intl.DateTimeFormat('en-US', {
      timeZone: sourceZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(approxUtc);

    const rMap: Record<string, number> = {};
    for (const p of rendered) {
      if (p.type !== 'literal') rMap[p.type] = parseInt(p.value, 10);
    }

    const renderedUtcEquiv = new Date(Date.UTC(rMap.year, rMap.month - 1, rMap.day, rMap.hour, rMap.minute, rMap.second));
    const offsetMs = renderedUtcEquiv.getTime() - approxUtc.getTime();
    return new Date(approxUtc.getTime() - offsetMs);
  } catch {
    return null;
  }
}

// ─── component ────────────────────────────────────────────────────────────────

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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Filtered timezone lists
  const filteredSource = TIMEZONES.filter(z =>
    z.toLowerCase().includes((tzSearch.source || '').toLowerCase())
  );
  const filteredTarget = TIMEZONES.filter(z =>
    z.toLowerCase().includes((tzSearch.target || '').toLowerCase())
  );

  // World clock ticker
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const times: Record<string, string> = {};
      const dates: Record<string, string> = {};
      for (const city of WORLD_CLOCK_CITIES) {
        times[city.zone] = formatWorldClock(now, city.zone);
        dates[city.zone] = formatWorldClockDate(now, city.zone);
      }
      setWorldClock(times);
      setWorldClockDates(dates);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConvert = () => {
    setError('');
    const utc = localDatetimeToUtc(datetimeInput, sourceZone);
    if (!utc) {
      setError('Could not parse the input date/time');
      setConverted('');
      return;
    }
    const result = formatInZone(utc, targetZone);
    setConverted(result);
    setSourceOffset(getUtcOffset(sourceZone, utc));
    setTargetOffset(getUtcOffset(targetZone, utc));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(converted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ZoneSelect = ({
    id,
    value,
    onChange,
    search,
    onSearchChange,
    filtered,
  }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    search: string;
    onSearchChange: (v: string) => void;
    filtered: string[];
  }) => (
    <div className='space-y-1'>
      <Input
        placeholder='Search timezone...'
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className='text-xs'
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={6}
        className='w-full rounded-md border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500'
      >
        {filtered.map(z => (
          <option key={z} value={z}>{z}</option>
        ))}
      </select>
      <p className='text-xs text-gray-500'>Selected: <span className='text-blue-400'>{value}</span></p>
    </div>
  );

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Timezone Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert date & time between any IANA timezones</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Conversion panel */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Date & Time</label>
                <input
                  type='datetime-local'
                  value={datetimeInput}
                  onChange={(e) => setDatetimeInput(e.target.value)}
                  className='w-full h-10 px-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#121212] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Source Timezone</label>
                  <ZoneSelect
                    id='source'
                    value={sourceZone}
                    onChange={setSourceZone}
                    search={tzSearch.source || ''}
                    onSearchChange={(v) => setTzSearch(s => ({ ...s, source: v }))}
                    filtered={filteredSource}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Target Timezone</label>
                  <ZoneSelect
                    id='target'
                    value={targetZone}
                    onChange={setTargetZone}
                    search={tzSearch.target || ''}
                    onSearchChange={(v) => setTzSearch(s => ({ ...s, target: v }))}
                    filtered={filteredTarget}
                  />
                </div>
              </div>

              <Button onClick={handleConvert} className='w-full' size='lg'>
                <Globe className='w-4 h-4 mr-2' />
                Convert
              </Button>

              {error && (
                <p className='text-sm text-red-400'>{error}</p>
              )}

              {converted && (
                <div className='bg-[#121212] rounded-md p-4 space-y-3'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <p className='text-xs text-gray-500 mb-1'>Converted time in {targetZone}</p>
                      <p className='text-lg font-mono font-semibold text-white'>{converted}</p>
                    </div>
                    <Button onClick={handleCopy} variant='outline' size='sm' className='shrink-0'>
                      {copied ? <><Check className='w-4 h-4 mr-1' />Copied</> : <><Copy className='w-4 h-4 mr-1' />Copy</>}
                    </Button>
                  </div>
                  <div className='flex gap-6 text-sm'>
                    <div>
                      <span className='text-gray-500'>Source offset: </span>
                      <span className='text-blue-400 font-mono'>{sourceOffset}</span>
                    </div>
                    <div>
                      <span className='text-gray-500'>Target offset: </span>
                      <span className='text-green-400 font-mono'>{targetOffset}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* World clock */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>World Clock</p>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                {WORLD_CLOCK_CITIES.map((city) => (
                  <div key={city.zone} className='bg-[#121212] rounded-md px-3 py-3'>
                    <p className='text-xs text-gray-400 mb-1'>{city.label}</p>
                    <p className='font-mono text-base font-semibold text-white'>{worldClock[city.zone] || '--:--:--'}</p>
                    <p className='text-xs text-gray-500 mt-0.5'>{worldClockDates[city.zone] || ''}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
