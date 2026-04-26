'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';
import { Clock, Copy, Check, AlertCircle } from 'lucide-react';

// ─── types ───────────────────────────────────────────────────────────────────

interface ParsedCron {
  second: string | null;
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
}

interface CronField {
  label: string;
  value: string;
  color: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const SHORTCUTS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseField(value: string, min: number, max: number): number[] | null {
  const result: number[] = [];
  const parts = value.split(',');
  for (const part of parts) {
    if (part === '*') {
      for (let i = min; i <= max; i++) result.push(i);
    } else if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2), 10);
      if (isNaN(step) || step <= 0) return null;
      for (let i = min; i <= max; i += step) result.push(i);
    } else if (part.includes('/')) {
      const [rangePart, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) return null;
      if (rangePart.includes('-')) {
        const [lo, hi] = rangePart.split('-').map(Number);
        if (isNaN(lo) || isNaN(hi) || lo < min || hi > max) return null;
        for (let i = lo; i <= hi; i += step) result.push(i);
      } else {
        const start = parseInt(rangePart, 10);
        if (isNaN(start)) return null;
        for (let i = start; i <= max; i += step) result.push(i);
      }
    } else if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number);
      if (isNaN(lo) || isNaN(hi) || lo < min || hi > max || lo > hi) return null;
      for (let i = lo; i <= hi; i++) result.push(i);
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n) || n < min || n > max) return null;
      result.push(n);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

function parseCronExpression(expr: string): { parsed: ParsedCron; error: string | null } {
  let e = expr.trim();

  // Handle shortcuts
  if (e.startsWith('@')) {
    if (SHORTCUTS[e]) {
      e = SHORTCUTS[e];
    } else {
      return { parsed: {} as ParsedCron, error: `Unknown shortcut: ${e}` };
    }
  }

  const parts = e.split(/\s+/);
  if (parts.length === 5) {
    const [minute, hour, day, month, weekday] = parts;
    return { parsed: { second: null, minute, hour, day, month, weekday }, error: null };
  } else if (parts.length === 6) {
    const [second, minute, hour, day, month, weekday] = parts;
    return { parsed: { second, minute, hour, day, month, weekday }, error: null };
  }
  return { parsed: {} as ParsedCron, error: 'Expression must have 5 or 6 fields' };
}

function fieldDescription(field: string, type: 'minute' | 'hour' | 'day' | 'month' | 'weekday'): string {
  if (field === '*') return `every ${type}`;
  if (field.startsWith('*/')) {
    const step = field.slice(2);
    return `every ${step} ${type}s`;
  }
  if (field.includes(',')) {
    const vals = field.split(',');
    if (type === 'month') return vals.map(v => MONTH_NAMES[parseInt(v, 10) - 1] || v).join(', ');
    if (type === 'weekday') return vals.map(v => WEEKDAY_NAMES[parseInt(v, 10)] || v).join(', ');
    return vals.join(', ');
  }
  if (field.includes('-')) {
    const [lo, hi] = field.split('-');
    if (type === 'month') return `${MONTH_NAMES[parseInt(lo, 10) - 1]} to ${MONTH_NAMES[parseInt(hi, 10) - 1]}`;
    if (type === 'weekday') return `${WEEKDAY_NAMES[parseInt(lo, 10)]} to ${WEEKDAY_NAMES[parseInt(hi, 10)]}`;
    return `${lo} to ${hi}`;
  }
  if (type === 'month') return MONTH_NAMES[parseInt(field, 10) - 1] || field;
  if (type === 'weekday') return WEEKDAY_NAMES[parseInt(field, 10)] || field;
  return field;
}

function buildDescription(parsed: ParsedCron): string {
  const { minute, hour, day, month, weekday } = parsed;

  const allMin = minute === '*';
  const allHour = hour === '*';
  const allDay = day === '*';
  const allMonth = month === '*';
  const allWeekday = weekday === '*';

  if (minute.startsWith('*/') && allHour && allDay && allMonth && allWeekday) {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (allMin && hour.startsWith('*/') && allDay && allMonth && allWeekday) {
    return `Every ${hour.slice(2)} hours`;
  }
  if (allMin && allHour && allDay && allMonth && allWeekday) {
    return 'Every minute';
  }

  const parts: string[] = [];

  if (!allWeekday) {
    parts.push(`on ${fieldDescription(weekday, 'weekday')}`);
  }
  if (!allMonth) {
    parts.push(`in ${fieldDescription(month, 'month')}`);
  }
  if (!allDay && allWeekday) {
    parts.push(`on day ${fieldDescription(day, 'day')} of the month`);
  }

  const minStr = allMin ? 'every minute' : `minute ${fieldDescription(minute, 'minute')}`;
  const hourStr = allHour ? 'every hour' : `${fieldDescription(hour, 'hour')}:${minute === '*' ? '00' : minute.padStart(2, '0')}`;

  if (!allHour && !allMin && !minute.includes('*') && !minute.includes('/')) {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    if (!isNaN(h) && !isNaN(m)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const timeStr = `${h12}:${minute.padStart(2, '0')} ${ampm}`;
      return ['At', timeStr, ...parts].filter(Boolean).join(' ');
    }
  }

  if (!allMin) parts.unshift(`at ${minStr}`);
  else parts.unshift('every minute');

  if (!allHour) parts.unshift(`past ${hourStr}`);

  return parts.join(', ') || 'Every minute';
}

function matchesField(value: number, field: string, min: number, max: number): boolean {
  const values = parseField(field, min, max);
  return values !== null && values.includes(value);
}

function getNextExecutions(parsed: ParsedCron, count: number): Date[] {
  const results: Date[] = [];
  const now = new Date();
  const cursor = new Date(now);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  let iterations = 0;
  const maxIter = count * 1000;

  while (results.length < count && iterations < maxIter) {
    iterations++;
    const min = cursor.getMinutes();
    const hr = cursor.getHours();
    const dayOfMonth = cursor.getDate();
    const mon = cursor.getMonth() + 1;
    const dow = cursor.getDay();

    // Per vixie-cron spec: when BOTH day-of-month and weekday are restricted
    // (neither is '*'), the job runs if EITHER condition matches (OR/union).
    // When only one is restricted, use AND so the wildcard field doesn't
    // inadvertently widen the match.
    const dayMatch =
      parsed.day !== '*' && parsed.weekday !== '*'
        ? matchesField(dayOfMonth, parsed.day, 1, 31) || matchesField(dow, parsed.weekday, 0, 6)
        : matchesField(dayOfMonth, parsed.day, 1, 31) && matchesField(dow, parsed.weekday, 0, 6);

    if (
      matchesField(min, parsed.minute, 0, 59) &&
      matchesField(hr, parsed.hour, 0, 23) &&
      matchesField(mon, parsed.month, 1, 12) &&
      dayMatch
    ) {
      results.push(new Date(cursor));
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return results;
}

function relativeTime(date: Date): string {
  const diff = date.getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  if (mins < 60) return `in ${mins} minute${mins !== 1 ? 's' : ''}`;
  if (hours < 24) return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

// ─── quick examples ───────────────────────────────────────────────────────────

const EXAMPLES = [
  { label: 'Every 5 minutes', expr: '*/5 * * * *' },
  { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Daily at midnight', expr: '0 0 * * *' },
  { label: 'Daily at 3 AM', expr: '0 3 * * *' },
  { label: 'Every Monday 9 AM', expr: '0 9 * * 1' },
  { label: 'First of month', expr: '0 0 1 * *' },
  { label: 'Every weekday noon', expr: '0 12 * * 1-5' },
  { label: 'Every Sunday midnight', expr: '0 0 * * 0' },
  { label: 'Twice daily', expr: '0 8,20 * * *' },
  { label: 'Every 15 minutes', expr: '*/15 * * * *' },
  { label: 'First of Jan & Jul', expr: '0 0 1 1,7 *' },
  { label: '@weekly', expr: '@weekly' },
];

const FIELD_COLORS: Record<string, string> = {
  Minute: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  Hour: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  Day: 'bg-green-500/20 text-green-300 border border-green-500/40',
  Month: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  Weekday: 'bg-pink-500/20 text-pink-300 border border-pink-500/40',
  Second: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
};

// ─── component ────────────────────────────────────────────────────────────────

export default function CronParserPage() {
  const [expression, setExpression] = useState('*/5 * * * *');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCron | null>(null);
  const [description, setDescription] = useState<string>('');
  const [nextTimes, setNextTimes] = useState<Date[]>([]);
  const [copied, setCopied] = useState(false);

  const analyze = (expr: string) => {
    const { parsed: p, error: e } = parseCronExpression(expr);
    if (e) {
      setError(e);
      setParsed(null);
      setDescription('');
      setNextTimes([]);
      return;
    }

    // Validate each field
    const checks: Array<[string, string, number, number]> = [
      [p.minute, 'minute', 0, 59],
      [p.hour, 'hour', 0, 23],
      [p.day, 'day', 1, 31],
      [p.month, 'month', 1, 12],
      [p.weekday, 'weekday', 0, 6],
    ];
    if (p.second !== null) checks.unshift([p.second, 'second', 0, 59]);

    for (const [val, name, min, max] of checks) {
      if (parseField(val, min, max) === null) {
        setError(`Invalid ${name} field: "${val}"`);
        setParsed(null);
        setDescription('');
        setNextTimes([]);
        return;
      }
    }

    setError(null);
    setParsed(p);
    setDescription(buildDescription(p));
    setNextTimes(getNextExecutions(p, 5));
  };

  const handleExprChange = (val: string) => {
    setExpression(val);
    analyze(val);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(expression);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build color-coded fields
  const fields: CronField[] = parsed
    ? [
        ...(parsed.second !== null ? [{ label: 'Second', value: parsed.second, color: FIELD_COLORS['Second'] }] : []),
        { label: 'Minute', value: parsed.minute, color: FIELD_COLORS['Minute'] },
        { label: 'Hour', value: parsed.hour, color: FIELD_COLORS['Hour'] },
        { label: 'Day', value: parsed.day, color: FIELD_COLORS['Day'] },
        { label: 'Month', value: parsed.month, color: FIELD_COLORS['Month'] },
        { label: 'Weekday', value: parsed.weekday, color: FIELD_COLORS['Weekday'] },
      ]
    : [];

  // Initialize on first render
  useEffect(() => {
    analyze('*/5 * * * *');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Cron Expression Parser</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Parse, validate, and preview cron schedules with next execution times</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Input */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <label className='block text-sm font-medium text-gray-300'>Cron Expression</label>
              <div className='flex gap-2'>
                <Input
                  value={expression}
                  onChange={(e) => handleExprChange(e.target.value)}
                  placeholder='e.g. */5 * * * * or @daily'
                  className='font-mono flex-1'
                />
                <Button onClick={handleCopy} variant='outline' size='sm' className='shrink-0'>
                  {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                </Button>
              </div>
              <p className='text-xs text-gray-500'>
                Supports 5-field (min hr day month weekday), 6-field (sec min hr day month weekday), and shortcuts like @daily, @hourly
              </p>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className='border-red-500/40'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-2 text-red-400'>
                  <AlertCircle className='w-4 h-4 shrink-0' />
                  <span className='text-sm'>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {parsed && !error && (
            <>
              {/* Human description */}
              <Card>
                <CardContent className='pt-6'>
                  <p className='text-xs text-gray-500 mb-1 uppercase tracking-wide'>Human-readable</p>
                  <p className='text-lg font-semibold text-white'>{description}</p>
                </CardContent>
              </Card>

              {/* Color-coded breakdown */}
              <Card>
                <CardContent className='pt-6 space-y-3'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Field Breakdown</p>
                  <div className='flex flex-wrap gap-2'>
                    {fields.map((f) => (
                      <div key={f.label} className={`rounded-md px-3 py-2 ${f.color}`}>
                        <p className='text-xs opacity-70 mb-0.5'>{f.label}</p>
                        <p className='font-mono font-semibold text-sm'>{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1'>
                    {fields.map((f) => (
                      <div key={f.label} className='text-xs'>
                        <span className='text-gray-500'>{f.label}: </span>
                        <span className='text-gray-300'>
                          {f.value === '*' ? 'any' :
                            f.value.startsWith('*/') ? `every ${f.value.slice(2)}` :
                            f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next executions */}
              {nextTimes.length > 0 && (
                <Card>
                  <CardContent className='pt-6 space-y-3'>
                    <p className='text-xs text-gray-500 uppercase tracking-wide'>Next 5 Executions</p>
                    <div className='space-y-2'>
                      {nextTimes.map((t, i) => (
                        <div key={i} className='flex items-center justify-between bg-[#121212] rounded-md px-3 py-2'>
                          <span className='font-mono text-sm text-gray-300'>{t.toISOString()}</span>
                          <span className='text-xs text-gray-500 ml-4 shrink-0'>{relativeTime(t)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Quick reference */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Quick Examples</p>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.expr}
                    onClick={() => handleExprChange(ex.expr)}
                    className='text-left rounded-md px-3 py-2 bg-[#121212] hover:bg-[#222] border border-[hsla(0,0%,20%,1)] transition-colors'
                  >
                    <p className='text-xs text-gray-400 mb-0.5'>{ex.label}</p>
                    <p className='font-mono text-xs text-blue-400'>{ex.expr}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Syntax reference */}
          <Card>
            <CardContent className='pt-6 space-y-2'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Syntax Reference</p>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs'>
                {[
                  ['*', 'Any value'],
                  ['*/n', 'Every n units'],
                  ['n', 'Exact value'],
                  ['n-m', 'Range'],
                  ['n,m', 'List'],
                  ['n-m/s', 'Range with step'],
                ].map(([token, desc]) => (
                  <div key={token} className='flex gap-2'>
                    <code className='text-blue-400 font-mono w-14 shrink-0'>{token}</code>
                    <span className='text-gray-400'>{desc}</span>
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
