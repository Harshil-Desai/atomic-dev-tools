'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { BpCopyBtn } from '@/components/blueprint';

type Flag = 'g' | 'i' | 'm' | 's';

interface MatchResult {
  value: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

interface QuickPattern {
  label: string;
  pattern: string;
  flags: string;
  description: string;
}

const QUICK_PATTERNS: QuickPattern[] = [
  { label: 'Email', pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', flags: 'g', description: 'Matches email addresses' },
  { label: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', flags: 'g', description: 'Matches HTTP/HTTPS URLs' },
  { label: 'IPv4', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g', description: 'Matches IPv4 addresses' },
  { label: 'Date (YYYY-MM-DD)', pattern: '\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b', flags: 'g', description: 'Matches ISO 8601 dates' },
  { label: 'Time (HH:MM)', pattern: '\\b([01]?[0-9]|2[0-3]):([0-5][0-9])\\b', flags: 'g', description: 'Matches 24-hour time' },
  { label: 'Phone (US)', pattern: '\\b(\\+1[\\s.-]?)?\\(?([0-9]{3})\\)?[\\s.-]?([0-9]{3})[\\s.-]?([0-9]{4})\\b', flags: 'g', description: 'Matches US phone numbers' },
  { label: 'Hex Color', pattern: '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b', flags: 'g', description: 'Matches hex color codes' },
  { label: 'Credit Card', pattern: '\\b(?:\\d{4}[\\s\\-]?){3}\\d{4}\\b', flags: 'g', description: 'Matches 16-digit card numbers' },
  { label: 'UUID', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', flags: 'gi', description: 'Matches UUID v1-v5' },
  { label: 'ZIP Code (US)', pattern: '\\b\\d{5}(?:-\\d{4})?\\b', flags: 'g', description: 'Matches US ZIP codes' },
  { label: 'HTML Tag', pattern: '<([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^>]*)?\\/?>|<\\/[a-zA-Z][a-zA-Z0-9]*>', flags: 'g', description: 'Matches HTML tags' },
  { label: 'Integer', pattern: '-?\\b\\d+\\b', flags: 'g', description: 'Matches integers (optional negative)' },
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
  '--bp-accent': '#f0c674',
} as React.CSSProperties;

function buildRegex(pattern: string, flags: Set<Flag>): { regex: RegExp | null; error: string | null } {
  if (!pattern) return { regex: null, error: null };
  try {
    const flagStr = Array.from(flags).join('');
    return { regex: new RegExp(pattern, flagStr), error: null };
  } catch (e) {
    return { regex: null, error: e instanceof Error ? e.message : 'Invalid pattern' };
  }
}

function getMatches(regex: RegExp | null, testString: string): MatchResult[] {
  if (!regex || !testString) return [];
  const results: MatchResult[] = [];
  if (regex.global) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(testString)) !== null) {
      results.push({ value: m[0], index: m.index, groups: m.slice(1), namedGroups: (m.groups as Record<string, string>) ?? {} });
      if (m[0].length === 0) regex.lastIndex++;
    }
  } else {
    const m = regex.exec(testString);
    if (m) results.push({ value: m[0], index: m.index, groups: m.slice(1), namedGroups: (m.groups as Record<string, string>) ?? {} });
  }
  return results;
}

function HighlightedText({ text, regex }: { text: string; regex: RegExp | null }) {
  if (!regex || !text) {
    return (
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, fontFamily: 'inherit', color: 'var(--bp-ink)' }}>
        {text || <span style={{ color: 'var(--bp-ink-faint)', fontStyle: 'italic' }}>No test string entered</span>}
      </span>
    );
  }
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;
  const safeRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  safeRegex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = safeRegex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push({ text: text.slice(lastIndex, m.index), highlighted: false });
    parts.push({ text: m[0], highlighted: true });
    lastIndex = m.index + m[0].length;
    if (m[0].length === 0) safeRegex.lastIndex++;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), highlighted: false });
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, fontFamily: 'inherit', color: 'var(--bp-ink)' }}>
      {parts.map((part, i) => part.highlighted ? (
        <mark key={i} style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', borderRadius: 2, padding: '0 2px' }}>{part.text}</mark>
      ) : (
        <span key={i}>{part.text}</span>
      ))}
    </span>
  );
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

export default function RegexTesterPage() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState<Set<Flag>>(new Set(['g']));
  const [testString, setTestString] = useState('');
  const [accordionOpen, setAccordionOpen] = useState(false);

  useEffect(() => {
    const checkViewport = () => setIsDesktop(window.innerWidth >= 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const { regex, error } = useMemo(() => buildRegex(pattern, flags), [pattern, flags]);
  const matches = useMemo(() => { if (!regex) return []; try { return getMatches(regex, testString); } catch { return []; } }, [regex, testString]);

  const toggleFlag = (flag: Flag) => {
    setFlags(prev => { const next = new Set(prev); next.has(flag) ? next.delete(flag) : next.add(flag); return next; });
  };

  const insertPattern = (qp: QuickPattern) => {
    setPattern(qp.pattern);
    const newFlags = new Set<Flag>();
    for (const ch of qp.flags) { if (['g', 'i', 'm', 's'].includes(ch)) newFlags.add(ch as Flag); }
    setFlags(newFlags);
  };

  const flagDefs: { flag: Flag; label: string; title: string }[] = [
    { flag: 'g', label: 'g', title: 'Global — find all matches' },
    { flag: 'i', label: 'i', title: 'Case insensitive' },
    { flag: 'm', label: 'm', title: 'Multiline — ^ and $ match line boundaries' },
    { flag: 's', label: 's', title: 'dotAll — . matches newlines' },
  ];

  const matchCountLabel = error ? null : !pattern ? null : matches.length === 0 ? 'No matches' : `${matches.length} match${matches.length !== 1 ? 'es' : ''} found`;
  const hasNamedGroups = matches.some(m => Object.keys(m.namedGroups).length > 0);
  const hasGroups = matches.some(m => m.groups.length > 0);
  const flagStr = Array.from(flags).join('');

  if (!isDesktop) {
    return (
      <div className='h-full flex flex-col items-center justify-center' style={{...CSS_VARS, background: 'var(--bp-bg)', color: 'var(--bp-ink)', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace'}}>
        <div className='text-center px-4 sm:px-6'>
          <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Desktop Only</h1>
          <p className='text-sm sm:text-base text-[var(--bp-ink-mute)] mb-4'>This tool requires a larger screen for optimal use.</p>
          <p className='text-xs sm:text-sm text-[var(--bp-ink-faint)]'>Please open this tool on a desktop or laptop (1024px+ width)</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='text'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 2 }}>Regex Tester</h1>
        <p style={{ fontSize: 11, color: 'var(--bp-ink-mute)', margin: 0 }}>Test regular expressions with live match highlighting and groups</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Pattern input panel */}
        <Panel title='Regular Expression' style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }}>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--bp-ink-mute)', fontFamily: 'inherit', fontSize: 16, userSelect: 'none' }}>/</span>
              <input
                style={{ flex: 1, background: 'var(--bp-bg)', border: '1px solid var(--bp-border-str)', color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }}
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder='Enter pattern...'
                spellCheck={false}
                autoCapitalize='none'
                autoCorrect='off'
              />
              <span style={{ color: 'var(--bp-ink-mute)', fontFamily: 'inherit', fontSize: 16, userSelect: 'none' }}>/</span>
              <span style={{ fontFamily: 'inherit', color: '#60a5fa', minWidth: '2rem', fontSize: 13 }}>{flagStr}</span>
              <BpCopyBtn text={`/${pattern}/${flagStr}`} label='COPY' />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {flagDefs.map(({ flag, label, title }) => (
                <label
                  key={flag}
                  title={title}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--bp-border)', background: 'var(--bp-bg)', cursor: 'pointer' }}
                >
                  <input
                    type='checkbox'
                    checked={flags.has(flag)}
                    onChange={() => toggleFlag(flag)}
                    style={{ width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 12, fontFamily: 'inherit', color: 'var(--bp-ink)' }}>{label}</span>
                  <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>{title.split(' — ')[0]}</span>
                </label>
              ))}
            </div>
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.2)' }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#f87171', margin: 0, marginBottom: 2 }}>Invalid pattern</p>
                  <p style={{ fontSize: 11, color: '#fca5a5', fontFamily: 'inherit', margin: 0 }}>{error}</p>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Test string + highlighting — side by side when both active */}
        <div style={{ display: 'grid', gridTemplateColumns: (testString || pattern) && !error ? '1fr 1fr' : '1fr', borderBottom: '1px solid var(--bp-border)' }}>
          <Panel title='Test String' meta={matchCountLabel || undefined} style={{ borderLeft: 0, borderRight: (testString || pattern) && !error ? undefined : 0, borderTop: 0, borderBottom: 0 }}>
            <textarea
              style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0, color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65, minHeight: 160 }}
              value={testString}
              onChange={e => setTestString(e.target.value)}
              placeholder='Enter test string...'
              rows={6}
              spellCheck={false}
            />
          </Panel>

          {(testString || pattern) && !error && (
            <Panel title='Match Highlighting' style={{ borderLeft: 0, borderRight: 0, borderTop: 0, borderBottom: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', minHeight: 160 }}>
                <HighlightedText text={testString} regex={regex} />
              </div>
            </Panel>
          )}
        </div>

        {/* Match details table */}
        {matches.length > 0 && !error && (
          <Panel title='Match Details' meta={`${matches.length} match${matches.length !== 1 ? 'es' : ''}`} style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bp-border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 9, color: 'var(--bp-ink-mute)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 9, color: 'var(--bp-ink-mute)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Match</th>
                    <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 9, color: 'var(--bp-ink-mute)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Index</th>
                    {hasGroups && <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 9, color: 'var(--bp-ink-mute)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Groups</th>}
                    {hasNamedGroups && <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 9, color: 'var(--bp-ink-mute)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Named Groups</th>}
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bp-border)' }}>
                      <td style={{ padding: '6px 12px', fontSize: 11, color: 'var(--bp-ink-mute)', fontFamily: 'inherit' }}>{i + 1}</td>
                      <td style={{ padding: '6px 12px' }}>
                        <code style={{ color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', fontSize: 11, fontFamily: 'inherit', wordBreak: 'break-all' }}>
                          {m.value === '' ? <span style={{ color: 'var(--bp-ink-faint)', fontStyle: 'italic' }}>(empty)</span> : m.value}
                        </code>
                      </td>
                      <td style={{ padding: '6px 12px', fontFamily: 'inherit', fontSize: 11, color: '#60a5fa' }}>{m.index}</td>
                      {hasGroups && (
                        <td style={{ padding: '6px 12px' }}>
                          {m.groups.length === 0 ? <span style={{ color: 'var(--bp-ink-faint)', fontSize: 11 }}>—</span> : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {m.groups.map((g, gi) => (
                                <code key={gi} style={{ fontSize: 11, fontFamily: 'inherit', color: '#facc15', background: 'rgba(234,179,8,0.1)', padding: '2px 4px' }}>
                                  {g === undefined ? <span style={{ color: 'var(--bp-ink-faint)', fontStyle: 'italic' }}>undefined</span> : g}
                                </code>
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                      {hasNamedGroups && (
                        <td style={{ padding: '6px 12px' }}>
                          {Object.keys(m.namedGroups).length === 0 ? <span style={{ color: 'var(--bp-ink-faint)', fontSize: 11 }}>—</span> : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {Object.entries(m.namedGroups).map(([k, v]) => (
                                <span key={k} style={{ fontSize: 11, fontFamily: 'inherit' }}>
                                  <span style={{ color: '#c084fc' }}>{k}</span>
                                  <span style={{ color: 'var(--bp-ink-faint)' }}>: </span>
                                  <code style={{ color: '#facc15', background: 'rgba(234,179,8,0.1)', padding: '2px 4px' }}>{String(v)}</code>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Quick reference patterns */}
        <Panel title='Quick Reference Patterns' style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }}>
          <div style={{ padding: '10px 14px' }}>
            <button
              onClick={() => setAccordionOpen(o => !o)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: accordionOpen ? 10 : 0, color: 'var(--bp-ink-mute)', fontFamily: 'inherit' }}
              type='button'
            >
              <span style={{ fontSize: 11 }}>{accordionOpen ? 'Hide patterns' : 'Show common patterns'}</span>
              {accordionOpen
                ? <ChevronDown style={{ width: 14, height: 14 }} />
                : <ChevronRight style={{ width: 14, height: 14 }} />
              }
            </button>
            {accordionOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {QUICK_PATTERNS.map(qp => (
                  <button
                    key={qp.label}
                    onClick={() => insertPattern(qp)}
                    type='button'
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '8px 10px', border: '1px solid var(--bp-border)', background: 'var(--bp-bg)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa' }}>{qp.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--bp-ink-mute)' }}>{qp.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {!pattern && !testString && (
          <div style={{ textAlign: 'center', color: 'var(--bp-ink-faint)', padding: '48px 20px' }}>
            <Search style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: 13, margin: '0 0 4px' }}>Enter a regex pattern and test string to get started</p>
            <p style={{ fontSize: 11, margin: 0 }}>Use the quick reference above to insert common patterns</p>
          </div>
        )}
      </div>
    </div>
  );
}
