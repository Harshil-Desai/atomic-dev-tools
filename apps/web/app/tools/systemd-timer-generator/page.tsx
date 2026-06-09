'use client';

import { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { AlertCircle } from 'lucide-react';

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

// ─── CSS vars ─────────────────────────────────────────────────────────────────

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#b48cff',
} as React.CSSProperties;

// ─── local Panel component ────────────────────────────────────────────────────

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

// ─── component ────────────────────────────────────────────────────────────────

export default function SystemdTimerGeneratorPage() {
  const [cronExpr, setCronExpr] = useState('*/5 * * * *');
  const [unitName, setUnitName] = useState('my-job');
  const [description, setDescription] = useState('');
  const [execStart, setExecStart] = useState('');
  const [persistent, setPersistent] = useState(true);
  const [onCalendar, setOnCalendar] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    <div className='h-full flex flex-col overflow-hidden' data-cat='systems' style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}>
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Systemd Timer Generator</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Convert cron expressions into systemd .timer and .service unit files</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '380px 1fr', overflow: 'hidden' }}>

        {/* LEFT: Configuration + Examples */}
        <Panel title='Configuration' style={{ borderTop: 0, borderLeft: 0, borderRight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Cron expression */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)' }}>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Cron Expression</label>
              <input
                value={cronExpr}
                onChange={(e) => handleExprChange(e.target.value)}
                placeholder='*/5 * * * *'
                style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 10, color: 'var(--bp-ink-faint)', margin: '5px 0 0' }}>5-field cron (min hr day month weekday) or shortcuts like @daily</p>
            </div>

            {/* Unit Name + ExecStart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--bp-border)' }}>
              <div style={{ padding: '12px 14px', borderRight: '1px solid var(--bp-border)' }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>Unit Name</label>
                <input
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value.replace(/\s+/g, '-'))}
                  placeholder='my-job'
                  style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 10, color: 'var(--bp-ink-faint)', margin: '5px 0 0' }}>{unitName || 'my-job'}.timer / .service</p>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>ExecStart</label>
                <input
                  value={execStart}
                  onChange={(e) => setExecStart(e.target.value)}
                  placeholder='/usr/bin/my-job'
                  style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)' }}>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', marginBottom: 6 }}>
                Description <span style={{ color: 'var(--bp-ink-faint)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Describe what this job does'
                style={{ width: '100%', background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Persistent checkbox */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bp-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={persistent}
                  onChange={(e) => setPersistent(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--bp-accent)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--bp-ink)' }}>
                  Persistent=true{' '}
                  <span style={{ color: 'var(--bp-ink-mute)' }}>(catch up missed runs after downtime)</span>
                </span>
              </label>
            </div>

            {/* Quick Examples */}
            <div style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)', margin: '0 0 8px' }}>Quick Examples</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.expr}
                    type='button'
                    onClick={() => handleExprChange(ex.expr)}
                    style={{ textAlign: 'left', background: 'var(--bp-bg)', border: '1px solid var(--bp-border)', padding: '7px 10px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--bp-border-str)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--bp-border)')}
                  >
                    <p style={{ fontSize: 10, color: 'var(--bp-ink-mute)', margin: '0 0 2px' }}>{ex.label}</p>
                    <p style={{ fontSize: 10, color: 'var(--bp-accent)', margin: 0, fontFamily: 'inherit' }}>{ex.expr}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Panel>

        {/* RIGHT: Output */}
        <Panel title='Output' style={{ borderTop: 0, borderRight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(239,68,68,0.3)', background: 'rgba(127,29,29,0.15)', flexShrink: 0 }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {!error && onCalendar && (
              <>
                {/* OnCalendar result */}
                <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-elevated)' }}>
                    <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>OnCalendar</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <BpCopyBtn text={onCalendar} label='COPY' />
                    </span>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--bp-bg)' }}>
                    <code style={{ fontSize: 13, color: '#86efac', fontFamily: 'inherit' }}>{onCalendar}</code>
                  </div>
                </div>

                {/* Timer unit */}
                {timerUnit && (
                  <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-elevated)' }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{unitName || 'my-job'}.timer</span>
                      <span style={{ marginLeft: 'auto' }}>
                        <BpCopyBtn text={timerUnit} label='COPY' />
                      </span>
                    </div>
                    <pre style={{ margin: 0, padding: '12px 14px', fontSize: 11, color: 'var(--bp-ink)', lineHeight: 1.7, background: 'var(--bp-bg)', overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'inherit' }}>{timerUnit}</pre>
                  </div>
                )}

                {/* Service unit */}
                {serviceUnit && (
                  <div style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-elevated)' }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{unitName || 'my-job'}.service</span>
                      <span style={{ marginLeft: 'auto' }}>
                        <BpCopyBtn text={serviceUnit} label='COPY' />
                      </span>
                    </div>
                    <pre style={{ margin: 0, padding: '12px 14px', fontSize: 11, color: 'var(--bp-ink)', lineHeight: 1.7, background: 'var(--bp-bg)', overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'inherit' }}>{serviceUnit}</pre>
                  </div>
                )}

                {/* Install instructions */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-elevated)' }}>
                    <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Install Instructions</span>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bp-bg)' }}>
                    {[
                      `sudo cp ${unitName || 'my-job'}.timer ${unitName || 'my-job'}.service /etc/systemd/system/`,
                      'sudo systemctl daemon-reload',
                      `sudo systemctl enable --now ${unitName || 'my-job'}.timer`,
                      `systemctl status ${unitName || 'my-job'}.timer`,
                    ].map((cmd, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ flex: 1, background: 'var(--bp-surface)', border: '1px solid var(--bp-border)', padding: '6px 10px', fontSize: 11, color: 'var(--bp-ink)', fontFamily: 'inherit', overflowX: 'auto', whiteSpace: 'nowrap' }}>{cmd}</code>
                        <BpCopyBtn text={cmd} label='COPY' />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!error && !onCalendar && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--bp-ink-faint)' }}>Enter a cron expression to generate unit files</p>
              </div>
            )}

          </div>
        </Panel>

      </div>
    </div>
  );
}
