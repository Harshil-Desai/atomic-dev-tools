'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, Input } from '@/ui';
import { Timer, Copy, Check, AlertCircle } from 'lucide-react';

// ─── cron → systemd OnCalendar conversion ────────────────────────────────────

const CRON_SHORTCUTS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const SYSTEMD_SHORTCUTS: Record<string, string> = {
  '@yearly': 'yearly',
  '@annually': 'annually',
  '@monthly': 'monthly',
  '@weekly': 'weekly',
  '@daily': 'daily',
  '@midnight': 'daily',
  '@hourly': 'hourly',
};

const WEEKDAY_MAP: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

function convertField(field: string): string {
  // Pass through most fields unchanged — systemd uses same syntax for *, */n, ranges, lists
  return field;
}

function parseWeekdayField(field: string): string | null {
  if (field === '*') return null;
  const parts = field.split(',');
  const days = parts.flatMap((p) => {
    if (p.includes('-')) {
      const [lo, hi] = p.split('-').map(Number);
      const result: string[] = [];
      for (let i = lo; i <= hi; i++) {
        if (WEEKDAY_MAP[i]) result.push(WEEKDAY_MAP[i]);
      }
      return result;
    }
    const n = parseInt(p, 10);
    return WEEKDAY_MAP[n] ? [WEEKDAY_MAP[n]] : [];
  });
  return days.length ? days.join(',') : null;
}

interface ConvertResult {
  onCalendar: string;
  error: string | null;
}

function cronToOnCalendar(expr: string): ConvertResult {
  const trimmed = expr.trim();

  if (trimmed.startsWith('@')) {
    if (SYSTEMD_SHORTCUTS[trimmed]) {
      return { onCalendar: SYSTEMD_SHORTCUTS[trimmed], error: null };
    }
    if (CRON_SHORTCUTS[trimmed]) {
      return cronToOnCalendar(CRON_SHORTCUTS[trimmed]);
    }
    return { onCalendar: '', error: `Unknown shortcut: ${trimmed}` };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return { onCalendar: '', error: 'Expression must have exactly 5 fields (min hr day month weekday)' };
  }

  const [minute, hour, day, month, weekday] = parts;

  const weekdayPrefix = parseWeekdayField(weekday);
  const prefix = weekdayPrefix ? `${weekdayPrefix} ` : '';

  const monthPart = convertField(month);
  const dayPart = convertField(day);
  const hourPart = convertField(hour);
  const minutePart = convertField(minute);

  const datePart = `*-${monthPart}-${dayPart}`;
  const timePart = `${hourPart}:${minutePart}:00`;

  return { onCalendar: `${prefix}${datePart} ${timePart}`, error: null };
}

// ─── unit file generators ─────────────────────────────────────────────────────

function generateTimerUnit(name: string, onCalendar: string, description: string, persistent: boolean): string {
  return `[Unit]
Description=${description || `Run ${name} on schedule`}
Documentation=man:systemd.timer(5)

[Timer]
OnCalendar=${onCalendar}${persistent ? '\nPersistent=true' : ''}
Unit=${name}.service

[Install]
WantedBy=timers.target
`;
}

function generateServiceUnit(name: string, description: string, execStart: string): string {
  return `[Unit]
Description=${description || `${name} service`}
Documentation=man:systemd.service(5)

[Service]
Type=oneshot
ExecStart=${execStart || `/usr/bin/${name}`}
`;
}

// ─── examples ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  { label: 'Every 5 min', expr: '*/5 * * * *' },
  { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Daily midnight', expr: '0 0 * * *' },
  { label: 'Every Monday 9 AM', expr: '0 9 * * 1' },
  { label: 'First of month', expr: '0 0 1 * *' },
  { label: 'Weekdays noon', expr: '0 12 * * 1-5' },
  { label: '@daily shortcut', expr: '@daily' },
  { label: '@hourly shortcut', expr: '@hourly' },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function SystemdTimerGeneratorPage() {
  const [cronExpr, setCronExpr] = useState('*/5 * * * *');
  const [unitName, setUnitName] = useState('my-job');
  const [description, setDescription] = useState('');
  const [execStart, setExecStart] = useState('');
  const [persistent, setPersistent] = useState(true);
  const [onCalendar, setOnCalendar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const convert = (expr: string) => {
    const { onCalendar: oc, error: e } = cronToOnCalendar(expr);
    setOnCalendar(oc);
    setError(e);
  };

  useEffect(() => { convert(cronExpr); }, []);

  const handleExprChange = (val: string) => {
    setCronExpr(val);
    convert(val);
  };

  const timerUnit = !error && onCalendar
    ? generateTimerUnit(unitName || 'my-job', onCalendar, description, persistent)
    : null;
  const serviceUnit = !error
    ? generateServiceUnit(unitName || 'my-job', description, execStart)
    : null;

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Systemd Timer Generator</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Convert cron expressions into systemd .timer and .service unit files</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-4xl mx-auto space-y-4'>

          {/* Config */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-1'>Cron Expression</label>
                <Input
                  value={cronExpr}
                  onChange={(e) => handleExprChange(e.target.value)}
                  placeholder='*/5 * * * *'
                  className='font-mono'
                />
                <p className='text-xs text-gray-500 mt-1'>5-field cron (min hr day month weekday) or shortcuts like @daily</p>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-1'>Unit Name</label>
                  <Input
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value.replace(/\s+/g, '-'))}
                    placeholder='my-job'
                  />
                  <p className='text-xs text-gray-500 mt-1'>Used as filename: {unitName || 'my-job'}.timer / .service</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-1'>ExecStart</label>
                  <Input
                    value={execStart}
                    onChange={(e) => setExecStart(e.target.value)}
                    placeholder='/usr/bin/my-job'
                    className='font-mono'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-1'>Description <span className='text-gray-500 font-normal'>(optional)</span></label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Describe what this job does'
                />
              </div>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={persistent}
                  onChange={(e) => setPersistent(e.target.checked)}
                  className='w-4 h-4 rounded'
                />
                <span className='text-sm text-gray-300'>Persistent=true <span className='text-gray-500'>(catch up missed runs after downtime)</span></span>
              </label>
            </CardContent>
          </Card>

          {/* Quick examples */}
          <Card>
            <CardContent className='pt-6 space-y-3'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Quick Examples</p>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
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

          {!error && onCalendar && (
            <>
              {/* OnCalendar preview */}
              <Card>
                <CardContent className='pt-6'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide mb-2'>Converted OnCalendar</p>
                  <div className='flex items-center gap-2'>
                    <code className='flex-1 bg-[#121212] rounded px-3 py-2 font-mono text-sm text-green-400'>{onCalendar}</code>
                    <Button variant='outline' size='sm' onClick={() => handleCopy(onCalendar, 'oncalendar')}>
                      {copied === 'oncalendar' ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Timer unit */}
              {timerUnit && (
                <Card>
                  <CardContent className='pt-6 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm font-semibold text-gray-300'>{unitName || 'my-job'}.timer</p>
                      <Button variant='outline' size='sm' onClick={() => handleCopy(timerUnit, 'timer')}>
                        {copied === 'timer' ? <><Check className='w-4 h-4 mr-1' />Copied</> : <><Copy className='w-4 h-4 mr-1' />Copy</>}
                      </Button>
                    </div>
                    <pre className='bg-[#121212] rounded-md p-4 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre'>{timerUnit}</pre>
                  </CardContent>
                </Card>
              )}

              {/* Service unit */}
              {serviceUnit && (
                <Card>
                  <CardContent className='pt-6 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm font-semibold text-gray-300'>{unitName || 'my-job'}.service</p>
                      <Button variant='outline' size='sm' onClick={() => handleCopy(serviceUnit, 'service')}>
                        {copied === 'service' ? <><Check className='w-4 h-4 mr-1' />Copied</> : <><Copy className='w-4 h-4 mr-1' />Copy</>}
                      </Button>
                    </div>
                    <pre className='bg-[#121212] rounded-md p-4 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre'>{serviceUnit}</pre>
                  </CardContent>
                </Card>
              )}

              {/* Install instructions */}
              <Card>
                <CardContent className='pt-6 space-y-2'>
                  <p className='text-xs text-gray-500 uppercase tracking-wide'>Install Instructions</p>
                  {[
                    `sudo cp ${unitName || 'my-job'}.timer ${unitName || 'my-job'}.service /etc/systemd/system/`,
                    'sudo systemctl daemon-reload',
                    `sudo systemctl enable --now ${unitName || 'my-job'}.timer`,
                    `systemctl status ${unitName || 'my-job'}.timer`,
                  ].map((cmd, i) => (
                    <div key={i} className='flex items-center gap-2'>
                      <code className='flex-1 bg-[#121212] rounded px-3 py-2 font-mono text-xs text-gray-300'>{cmd}</code>
                      <Button variant='outline' size='sm' className='shrink-0' onClick={() => handleCopy(cmd, `cmd-${i}`)}>
                        {copied === `cmd-${i}` ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
