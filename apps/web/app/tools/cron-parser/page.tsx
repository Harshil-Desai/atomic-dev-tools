'use client';

import { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
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
    <div className='h-full flex flex-col overflow-hidden' data-cat='time' style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}>
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>Cron Expression Parser</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Parse cron expressions and preview next scheduled run times</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className='p-2 sm:p-3 md:p-4' style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          <Panel title='Cron Expression'>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={expression}
                  onChange={(e) => handleExprChange(e.target.value)}
                  placeholder='e.g. */5 * * * * or @daily'
                  style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                />
                <BpCopyBtn text={expression} label='COPY' className='min-h-10 px-2 py-1' />
              </div>
              <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Supports 5-field (min hr day month weekday), 6-field (sec min hr day month weekday), and shortcuts like @daily, @hourly</p>
            </div>
          </Panel>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.2)' }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#fca5a5' }}>{error}</span>
            </div>
          )}

          {parsed && !error && (
            <>
              <Panel title='Human-readable'>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{description}</p>
                </div>
              </Panel>

              <Panel title='Field Breakdown'>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {fields.map((f) => (
                      <div key={f.label} className={`rounded px-3 py-2 ${f.color}`}>
                        <p className='text-xs opacity-70 mb-0.5'>{f.label}</p>
                        <p className='font-mono font-semibold text-sm'>{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
                    {fields.map((f) => (
                      <div key={f.label} style={{ fontSize: 11 }}>
                        <span style={{ color: 'var(--bp-ink-mute)' }}>{f.label}: </span>
                        <span style={{ color: 'var(--bp-ink)' }}>{f.value === '*' ? 'any' : f.value.startsWith('*/') ? `every ${f.value.slice(2)}` : f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              {nextTimes.length > 0 && (
                <Panel title='Next 5 Executions'>
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {nextTimes.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bp-bg)', padding: '7px 10px', border: '1px solid var(--bp-border)' }}>
                        <span style={{ fontFamily: 'inherit', fontSize: 12, color: 'var(--bp-ink)' }}>{t.toISOString()}</span>
                        <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', marginLeft: 16, flexShrink: 0 }}>{relativeTime(t)}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </>
          )}

          <Panel title='Quick Examples'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3'>
              {EXAMPLES.map((ex) => (
                <button key={ex.expr} type='button' onClick={() => handleExprChange(ex.expr)}
                  className='bp-btn text-left flex flex-col gap-0.5 min-h-10 px-3'>
                  <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>{ex.label}</span>
                  <span style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--bp-accent)' }}>{ex.expr}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title='Syntax Reference'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3'>
              {[['*', 'Any value'], ['*/n', 'Every n units'], ['n', 'Exact value'], ['n-m', 'Range'], ['n,m', 'List'], ['n-m/s', 'Range with step']].map(([token, desc]) => (
                <div key={token} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <code style={{ color: 'var(--bp-accent)', fontFamily: 'inherit', width: 52, flexShrink: 0 }}>{token}</code>
                  <span style={{ color: 'var(--bp-ink-mute)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
