'use client';

import { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { AlertCircle } from 'lucide-react';

const PATTERNS = {
  urls: { label: 'URLs', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', regex: /https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+(?:\/(?:[\w\-.~:/?#[\]@!$&'()*+,;=%])*)?/g, description: 'http:// and https:// URLs' },
  domains: { label: 'Domains', color: 'bg-green-500/20 text-green-300 border-green-500/40', regex: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|dev|app|co|uk|de|fr|jp|cn|au|ca|gov|edu|mil|int|info|biz|name|pro|museum|travel|jobs|mobi|tel|cat|post|xxx|aero|coop|asia|tel|arpa|[a-z]{2})\b/gi, description: 'Registered domain names with known TLDs' },
  emails: { label: 'Emails', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, description: 'Email addresses' },
  ipv4: { label: 'IPv4', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', regex: /\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\b/g, description: 'IPv4 addresses' },
  ipv6: { label: 'IPv6', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', regex: /(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|::(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}/g, description: 'IPv6 addresses' },
} as const;

type PatternKey = keyof typeof PATTERNS;

const SAMPLE = `Server logs from 2024-01-15:\n\n[INFO] Request from 192.168.1.42 to https://api.example.com/v2/users\n[WARN] Failed login attempt for user@company.io from 10.0.0.1\n[INFO] Redirect: http://old.myapp.dev/path?query=1#anchor → https://new.myapp.dev/path\n[ERROR] Timeout connecting to db.internal.corp:5432 (2001:db8::1)\n[INFO] CDN asset loaded from https://cdn.cloudflare.com/assets/app.min.js\n\nContact: support@helpdesk.org | abuse@security.net\nDocs: https://docs.example.io/getting-started\n\nBlocked IPs: 203.0.113.0, 198.51.100.255, ::1, fe80::1\nTrusted: 172.16.0.0, 10.10.10.10`;

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#f0c674',
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

export default function URLRegexMatcherPage() {
  const [text, setText] = useState(SAMPLE);
  const [enabledPatterns, setEnabledPatterns] = useState<Set<PatternKey>>(new Set(['urls', 'emails', 'ipv4'] as PatternKey[]));
  const [dedup, setDedup] = useState(true);

  const togglePattern = (key: PatternKey) => {
    setEnabledPatterns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const results: Record<PatternKey, string[]> = {} as Record<PatternKey, string[]>;
  for (const [key, def] of Object.entries(PATTERNS) as [PatternKey, typeof PATTERNS[PatternKey]][]) {
    if (!enabledPatterns.has(key)) { results[key] = []; continue; }
    const matches = text.match(new RegExp(def.regex.source, def.regex.flags)) ?? [];
    results[key] = dedup ? [...new Set(matches)] : matches;
  }

  const totalMatches = Object.values(results).reduce((n, arr) => n + arr.length, 0);

  const copyAllResults = () => {
    const lines = (Object.entries(results) as [PatternKey, string[]][])
      .filter(([, arr]) => arr.length)
      .map(([k, arr]) => `# ${PATTERNS[k].label}\n${arr.join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(lines);
  };

  return (
    <div
      data-cat='text'
      style={{
        ...CSS_VARS,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bp-bg)',
        color: 'var(--bp-ink)',
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.01em' }}>URL Regex Matcher</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: '2px 0 0' }}>Test URL patterns against regular expressions</p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* Left: Input panel */}
        <Panel title='Input' style={{ borderRight: 0, borderTop: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Controls bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--bp-border)', flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', marginRight: 2 }}>Extract:</span>
              {(Object.entries(PATTERNS) as [PatternKey, typeof PATTERNS[PatternKey]][]).map(([key, def]) => (
                <button
                  key={key}
                  onClick={() => togglePattern(key)}
                  type='button'
                  className={`bp-chip ${enabledPatterns.has(key) ? def.color : ''}`}
                  style={!enabledPatterns.has(key) ? { background: 'var(--bp-elevated)', color: 'var(--bp-ink-mute)', borderColor: 'var(--bp-border-str)' } : {}}
                >
                  {def.label}
                </button>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 4 }}>
                <input
                  type='checkbox'
                  checked={dedup}
                  onChange={(e) => setDedup(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--bp-accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>Deduplicate</span>
              </label>
            </div>
            {/* Textarea */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Paste logs, HTML, config files, or any text here...'
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                background: 'var(--bp-bg)',
                border: 0,
                color: 'var(--bp-ink)',
                fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                fontSize: 12,
                padding: '12px 14px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.65,
              }}
            />
            {/* Stats / actions bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)', flex: 1 }}>
                Found{' '}
                <span style={{ color: 'var(--bp-ink)', fontWeight: 600 }}>{totalMatches}</span>
                {' '}match{totalMatches !== 1 ? 'es' : ''}{dedup ? ' (unique)' : ''}
              </span>
              {totalMatches > 0 && (
                <button className='bp-btn' onClick={copyAllResults} type='button'>
                  COPY ALL
                </button>
              )}
            </div>
          </div>
        </Panel>

        {/* Right: Results panel */}
        <Panel title='Results' meta={totalMatches > 0 ? `${totalMatches} match${totalMatches !== 1 ? 'es' : ''}` : undefined} style={{ borderTop: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {(Object.entries(results) as [PatternKey, string[]][])
              .filter(([key]) => enabledPatterns.has(key))
              .map(([key, matches]) => {
                const def = PATTERNS[key];
                return (
                  <div key={key} style={{ borderBottom: '1px solid var(--bp-border)', flexShrink: 0 }}>
                    {/* Result section header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bp-elevated)', borderBottom: matches.length > 0 ? '1px solid var(--bp-border)' : 'none' }}>
                      <span className={`bp-chip ${def.color}`}>{def.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)', flex: 1 }}>{def.description}</span>
                      <span style={{ fontSize: 10, color: 'var(--bp-ink-faint)' }}>{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                      {matches.length > 0 && <BpCopyBtn text={matches.join('\n')} label='COPY' />}
                    </div>
                    {/* Match list or empty state */}
                    {matches.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', color: 'var(--bp-ink-faint)', fontSize: 11 }}>
                        <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                        <span>No {def.label.toLowerCase()} found</span>
                      </div>
                    ) : (
                      <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {matches.map((match, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }} className='group'>
                            <code style={{
                              flex: 1,
                              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                              fontSize: 11,
                              color: 'var(--bp-ink)',
                              background: 'var(--bp-bg)',
                              padding: '3px 8px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}>{match}</code>
                            <div className='opacity-0 group-hover:opacity-100 transition-opacity' style={{ flexShrink: 0 }}>
                              <BpCopyBtn text={match} label='COPY' />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Regex patterns reference at the bottom */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--bp-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 28, borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--bp-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Regex Patterns</span>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(Object.entries(PATTERNS) as [PatternKey, typeof PATTERNS[PatternKey]][]).map(([key, def]) => (
                  <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span className={`bp-chip ${def.color}`} style={{ flexShrink: 0 }}>{def.label}</span>
                    <code style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                      color: 'var(--bp-ink-mute)',
                      wordBreak: 'break-all',
                      lineHeight: 1.5,
                    }}>{def.regex.source}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
