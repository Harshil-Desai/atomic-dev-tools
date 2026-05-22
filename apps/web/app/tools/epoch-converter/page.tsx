'use client';

import { useState, useEffect } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { Clock } from 'lucide-react';

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
    <BpToolStage cat='time'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Epoch Time Converter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert between human-readable dates and Unix timestamps</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-6xl mx-auto space-y-4'>

          <BpPanel title='Current Epoch Time'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <p className='text-lg sm:text-2xl font-mono text-white'>{currentEpoch}</p>
                <p className='text-xs sm:text-sm text-gray-500 mt-1'>{new Date(currentEpoch * 1000).toLocaleString()}</p>
              </div>
              <BpCopyBtn text={currentEpoch.toString()} label='COPY' />
            </div>
          </BpPanel>

          <BpPanel title='Quick Actions'>
            <div className='flex flex-wrap gap-2'>
              {[['now', 'Now'], ['+1hour', '+1 hour'], ['+1day', '+1 day'], ['+1week', '+1 week'], ['today', 'Start of Today'], ['yesterday', 'Yesterday']].map(([action, label]) => (
                <button key={action} type='button' className='bp-btn' onClick={() => quickAction(action)}>{label}</button>
              ))}
            </div>
          </BpPanel>

          <div className='bp-layout-2col'>
            <BpPanel title='Human → Epoch'>
              <div className='flex items-center justify-between mb-3'>
                <label className='text-xs text-gray-500'>Timezone</label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value as 'UTC' | 'Local')} className='bp-input h-7 px-2 text-xs'>
                  <option>Local</option>
                  <option>UTC</option>
                </select>
              </div>
              <input type='datetime-local' value={humanInput} onChange={(e) => setHumanInput(e.target.value)} className='bp-input w-full mb-3' />
              <button type='button' className='bp-btn bp-btn-solid w-full mb-3' onClick={humanToEpoch} disabled={!humanInput.trim()}>CONVERT</button>
              {epochOutput && (
                <div className='bp-code-view px-3 py-3'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs text-gray-400'>Result:</span>
                    <BpCopyBtn text={epochOutput} label='COPY' />
                  </div>
                  <pre className='text-sm font-mono text-gray-300 whitespace-pre-wrap'>{epochOutput}</pre>
                </div>
              )}
            </BpPanel>

            <BpPanel title='Epoch → Human'>
              <div className='flex items-center justify-between mb-3'>
                <label className='text-xs text-gray-500'>Timezone</label>
                <select value={timezone} onChange={(e) => { setTimezone(e.target.value as 'UTC' | 'Local'); if (epochInput) epochToHuman(); }} className='bp-input h-7 px-2 text-xs'>
                  <option>Local</option>
                  <option>UTC</option>
                </select>
              </div>
              <input type='number' placeholder='Enter epoch timestamp (seconds or ms)' value={epochInput}
                onChange={(e) => { setEpochInput(e.target.value); if (e.target.value.trim()) setTimeout(() => epochToHuman(), 300); }}
                className='bp-input w-full font-mono mb-3' />
              <button type='button' className='bp-btn bp-btn-solid w-full mb-3' onClick={epochToHuman} disabled={!epochInput.trim()}>CONVERT</button>
              {humanOutput && (
                <div className='bp-code-view px-3 py-3'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs text-gray-400'>Result:</span>
                    <BpCopyBtn text={humanOutput} label='COPY' />
                  </div>
                  <pre className='text-sm font-mono text-gray-300 whitespace-pre-wrap'>{humanOutput}</pre>
                </div>
              )}
            </BpPanel>
          </div>

          {!humanInput && !epochInput && (
            <div className='text-center text-gray-600 py-12'>
              <Clock className='w-12 h-12 mx-auto mb-4 opacity-40' />
              <p className='text-sm'>Enter a date or epoch timestamp to convert</p>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
