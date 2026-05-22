'use client';

import { useState, useEffect } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { AlertCircle } from 'lucide-react';

interface ParsedCron { second: string | null; minute: string; hour: string; day: string; month: string; weekday: string; }
interface CronField { label: string; value: string; color: string; }

const SHORTCUTS: Record<string, string> = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseField(value: string, min: number, max: number): number[] | null {
  const result: number[] = [];
  for (const part of value.split(',')) {
    if (part === '*') { for (let i = min; i <= max; i++) result.push(i); }
    else if (part.startsWith('*/')) { const step = parseInt(part.slice(2), 10); if (isNaN(step) || step <= 0) return null; for (let i = min; i <= max; i += step) result.push(i); }
    else if (part.includes('/')) { const [rangePart, stepStr] = part.split('/'); const step = parseInt(stepStr, 10); if (isNaN(step) || step <= 0) return null; if (rangePart.includes('-')) { const [lo, hi] = rangePart.split('-').map(Number); if (isNaN(lo) || isNaN(hi) || lo < min || hi > max) return null; for (let i = lo; i <= hi; i += step) result.push(i); } else { const start = parseInt(rangePart, 10); if (isNaN(start)) return null; for (let i = start; i <= max; i += step) result.push(i); } }
    else if (part.includes('-')) { const [lo, hi] = part.split('-').map(Number); if (isNaN(lo) || isNaN(hi) || lo < min || hi > max || lo > hi) return null; for (let i = lo; i <= hi; i++) result.push(i); }
    else { const n = parseInt(part, 10); if (isNaN(n) || n < min || n > max) return null; result.push(n); }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

function parseCronExpression(expr: string): { parsed: ParsedCron; error: string | null } {
  let e = expr.trim();
  if (e.startsWith('@')) { if (SHORTCUTS[e]) e = SHORTCUTS[e]; else return { parsed: {} as ParsedCron, error: `Unknown shortcut: ${e}` }; }
  const parts = e.split(/\s+/);
  if (parts.length === 5) { const [minute, hour, day, month, weekday] = parts; return { parsed: { second: null, minute, hour, day, month, weekday }, error: null }; }
  if (parts.length === 6) { const [second, minute, hour, day, month, weekday] = parts; return { parsed: { second, minute, hour, day, month, weekday }, error: null }; }
  return { parsed: {} as ParsedCron, error: 'Expression must have 5 or 6 fields' };
}

function fieldDescription(field: string, type: 'minute' | 'hour' | 'day' | 'month' | 'weekday'): string {
  if (field === '*') return `every ${type}`;
  if (field.startsWith('*/')) return `every ${field.slice(2)} ${type}s`;
  if (field.includes(',')) { const vals = field.split(','); if (type === 'month') return vals.map(v => MONTH_NAMES[parseInt(v, 10) - 1] || v).join(', '); if (type === 'weekday') return vals.map(v => WEEKDAY_NAMES[parseInt(v, 10)] || v).join(', '); return vals.join(', '); }
  if (field.includes('-')) { const [lo, hi] = field.split('-'); if (type === 'month') return `${MONTH_NAMES[parseInt(lo, 10) - 1]} to ${MONTH_NAMES[parseInt(hi, 10) - 1]}`; if (type === 'weekday') return `${WEEKDAY_NAMES[parseInt(lo, 10)]} to ${WEEKDAY_NAMES[parseInt(hi, 10)]}`; return `${lo} to ${hi}`; }
  if (type === 'month') return MONTH_NAMES[parseInt(field, 10) - 1] || field;
  if (type === 'weekday') return WEEKDAY_NAMES[parseInt(field, 10)] || field;
  return field;
}

function buildDescription(parsed: ParsedCron): string {
  const { minute, hour, day, month, weekday } = parsed;
  const allMin = minute === '*', allHour = hour === '*', allDay = day === '*', allMonth = month === '*', allWeekday = weekday === '*';
  if (minute.startsWith('*/') && allHour && allDay && allMonth && allWeekday) return `Every ${minute.slice(2)} minutes`;
  if (allMin && hour.startsWith('*/') && allDay && allMonth && allWeekday) return `Every ${hour.slice(2)} hours`;
  if (allMin && allHour && allDay && allMonth && allWeekday) return 'Every minute';
  const parts: string[] = [];
  if (!allWeekday) parts.push(`on ${fieldDescription(weekday, 'weekday')}`);
  if (!allMonth) parts.push(`in ${fieldDescription(month, 'month')}`);
  if (!allDay && allWeekday) parts.push(`on day ${fieldDescription(day, 'day')} of the month`);
  if (!allHour && !allMin && !minute.includes('*') && !minute.includes('/')) { const h = parseInt(hour, 10), m = parseInt(minute, 10); if (!isNaN(h) && !isNaN(m)) { const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12; return ['At', `${h12}:${minute.padStart(2, '0')} ${ampm}`, ...parts].filter(Boolean).join(' '); } }
  if (!allMin) parts.unshift(`at every minute ${fieldDescription(minute, 'minute')}`);
  else parts.unshift('every minute');
  if (!allHour) parts.unshift(`past ${fieldDescription(hour, 'hour')}`);
  return parts.join(', ') || 'Every minute';
}

function matchesField(value: number, field: string, min: number, max: number): boolean { const values = parseField(field, min, max); return values !== null && values.includes(value); }

function getNextExecutions(parsed: ParsedCron, count: number): Date[] {
  const results: Date[] = [];
  const cursor = new Date(); cursor.setSeconds(0, 0); cursor.setMinutes(cursor.getMinutes() + 1);
  let iterations = 0;
  while (results.length < count && iterations < count * 1000) {
    iterations++;
    const min = cursor.getMinutes(), hr = cursor.getHours(), dayOfMonth = cursor.getDate(), mon = cursor.getMonth() + 1, dow = cursor.getDay();
    const dayMatch = parsed.day !== '*' && parsed.weekday !== '*'
      ? matchesField(dayOfMonth, parsed.day, 1, 31) || matchesField(dow, parsed.weekday, 0, 6)
      : matchesField(dayOfMonth, parsed.day, 1, 31) && matchesField(dow, parsed.weekday, 0, 6);
    if (matchesField(min, parsed.minute, 0, 59) && matchesField(hr, parsed.hour, 0, 23) && matchesField(mon, parsed.month, 1, 12) && dayMatch) results.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return results;
}

function relativeTime(date: Date): string { const diff = date.getTime() - Date.now(); const mins = Math.round(diff / 60000); const hours = Math.round(diff / 3600000); const days = Math.round(diff / 86400000); if (mins < 60) return `in ${mins} minute${mins !== 1 ? 's' : ''}`; if (hours < 24) return `in ${hours} hour${hours !== 1 ? 's' : ''}`; return `in ${days} day${days !== 1 ? 's' : ''}`; }

const EXAMPLES = [
  { label: 'Every 5 minutes', expr: '*/5 * * * *' }, { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Daily at midnight', expr: '0 0 * * *' }, { label: 'Daily at 3 AM', expr: '0 3 * * *' },
  { label: 'Every Monday 9 AM', expr: '0 9 * * 1' }, { label: 'First of month', expr: '0 0 1 * *' },
  { label: 'Every weekday noon', expr: '0 12 * * 1-5' }, { label: 'Every Sunday midnight', expr: '0 0 * * 0' },
  { label: 'Twice daily', expr: '0 8,20 * * *' }, { label: 'Every 15 minutes', expr: '*/15 * * * *' },
  { label: 'First of Jan & Jul', expr: '0 0 1 1,7 *' }, { label: '@weekly', expr: '@weekly' },
];

const FIELD_COLORS: Record<string, string> = {
  Minute: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  Hour: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  Day: 'bg-green-500/20 text-green-300 border border-green-500/40',
  Month: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  Weekday: 'bg-pink-500/20 text-pink-300 border border-pink-500/40',
  Second: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
};

export default function CronParserPage() {
  const [expression, setExpression] = useState('*/5 * * * *');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCron | null>(null);
  const [description, setDescription] = useState<string>('');
  const [nextTimes, setNextTimes] = useState<Date[]>([]);

  const analyze = (expr: string) => {
    const { parsed: p, error: e } = parseCronExpression(expr);
    if (e) { setError(e); setParsed(null); setDescription(''); setNextTimes([]); return; }
    const checks: Array<[string, string, number, number]> = [[p.minute, 'minute', 0, 59], [p.hour, 'hour', 0, 23], [p.day, 'day', 1, 31], [p.month, 'month', 1, 12], [p.weekday, 'weekday', 0, 6]];
    if (p.second !== null) checks.unshift([p.second, 'second', 0, 59]);
    for (const [val, name, min, max] of checks) { if (parseField(val, min, max) === null) { setError(`Invalid ${name} field: "${val}"`); setParsed(null); setDescription(''); setNextTimes([]); return; } }
    setError(null); setParsed(p); setDescription(buildDescription(p)); setNextTimes(getNextExecutions(p, 5));
  };

  const handleExprChange = (val: string) => { setExpression(val); analyze(val); };

  const fields: CronField[] = parsed ? [
    ...(parsed.second !== null ? [{ label: 'Second', value: parsed.second, color: FIELD_COLORS['Second'] }] : []),
    { label: 'Minute', value: parsed.minute, color: FIELD_COLORS['Minute'] },
    { label: 'Hour', value: parsed.hour, color: FIELD_COLORS['Hour'] },
    { label: 'Day', value: parsed.day, color: FIELD_COLORS['Day'] },
    { label: 'Month', value: parsed.month, color: FIELD_COLORS['Month'] },
    { label: 'Weekday', value: parsed.weekday, color: FIELD_COLORS['Weekday'] },
  ] : [];

  useEffect(() => { analyze('*/5 * * * *'); }, []);

  return (
    <BpToolStage cat='time'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Cron Expression Parser</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Parse, validate, and preview cron schedules with next execution times</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          <BpPanel title='Cron Expression'>
            <div className='flex gap-2 mb-2'>
              <input value={expression} onChange={(e) => handleExprChange(e.target.value)} placeholder='e.g. */5 * * * * or @daily' className='bp-input font-mono flex-1' />
              <BpCopyBtn text={expression} label='COPY' />
            </div>
            <p className='text-xs text-gray-500'>Supports 5-field (min hr day month weekday), 6-field (sec min hr day month weekday), and shortcuts like @daily, @hourly</p>
          </BpPanel>

          {error && (
            <div className='flex items-center gap-2 p-3 rounded border border-red-500/40 bg-red-950/20'>
              <AlertCircle className='w-4 h-4 text-red-400 shrink-0' />
              <span className='text-sm text-red-300'>{error}</span>
            </div>
          )}

          {parsed && !error && (
            <>
              <BpPanel title='Human-readable'>
                <p className='text-lg font-semibold text-white'>{description}</p>
              </BpPanel>

              <BpPanel title='Field Breakdown'>
                <div className='flex flex-wrap gap-2 mb-3'>
                  {fields.map((f) => (
                    <div key={f.label} className={`rounded px-3 py-2 ${f.color}`}>
                      <p className='text-xs opacity-70 mb-0.5'>{f.label}</p>
                      <p className='font-mono font-semibold text-sm'>{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'>
                  {fields.map((f) => (
                    <div key={f.label} className='text-xs'>
                      <span className='text-gray-500'>{f.label}: </span>
                      <span className='text-gray-300'>{f.value === '*' ? 'any' : f.value.startsWith('*/') ? `every ${f.value.slice(2)}` : f.value}</span>
                    </div>
                  ))}
                </div>
              </BpPanel>

              {nextTimes.length > 0 && (
                <BpPanel title='Next 5 Executions'>
                  <div className='space-y-2'>
                    {nextTimes.map((t, i) => (
                      <div key={i} className='flex items-center justify-between bg-[#121212] rounded px-3 py-2'>
                        <span className='font-mono text-sm text-gray-300'>{t.toISOString()}</span>
                        <span className='text-xs text-gray-500 ml-4 shrink-0'>{relativeTime(t)}</span>
                      </div>
                    ))}
                  </div>
                </BpPanel>
              )}
            </>
          )}

          <BpPanel title='Quick Examples'>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {EXAMPLES.map((ex) => (
                <button key={ex.expr} type='button' onClick={() => handleExprChange(ex.expr)}
                  className='bp-btn text-left flex flex-col gap-0.5'>
                  <span className='text-xs text-gray-400'>{ex.label}</span>
                  <span className='font-mono text-xs text-blue-400'>{ex.expr}</span>
                </button>
              ))}
            </div>
          </BpPanel>

          <BpPanel title='Syntax Reference'>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs'>
              {[['*', 'Any value'], ['*/n', 'Every n units'], ['n', 'Exact value'], ['n-m', 'Range'], ['n,m', 'List'], ['n-m/s', 'Range with step']].map(([token, desc]) => (
                <div key={token} className='flex gap-2'>
                  <code className='text-blue-400 font-mono w-14 shrink-0'>{token}</code>
                  <span className='text-gray-400'>{desc}</span>
                </div>
              ))}
            </div>
          </BpPanel>

        </div>
      </div>
    </BpToolStage>
  );
}
