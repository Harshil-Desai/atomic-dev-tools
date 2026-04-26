'use client';

import { useState, useMemo } from 'react';
import { Search, Copy, Check, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/ui';
import { Card, CardContent } from '@/ui';
import { Input } from '@/ui';
import { Textarea } from '@/ui';

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
      results.push({
        value: m[0],
        index: m.index,
        groups: m.slice(1),
        namedGroups: (m.groups as Record<string, string>) ?? {},
      });
      if (m[0].length === 0) regex.lastIndex++;
    }
  } else {
    const m = regex.exec(testString);
    if (m) {
      results.push({
        value: m[0],
        index: m.index,
        groups: m.slice(1),
        namedGroups: (m.groups as Record<string, string>) ?? {},
      });
    }
  }
  return results;
}

interface HighlightedTextProps {
  text: string;
  regex: RegExp | null;
}

function HighlightedText({ text, regex }: HighlightedTextProps) {
  if (!regex || !text) {
    return <span className="whitespace-pre-wrap break-all text-sm font-mono text-gray-300">{text || <span className="text-gray-600 italic">No test string entered</span>}</span>;
  }

  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;
  const safeRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  safeRegex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = safeRegex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, m.index), highlighted: false });
    }
    parts.push({ text: m[0], highlighted: true });
    lastIndex = m.index + m[0].length;
    if (m[0].length === 0) safeRegex.lastIndex++;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return (
    <span className="whitespace-pre-wrap break-all text-sm font-mono text-gray-300">
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="bg-green-500/20 text-green-400 rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState<Set<Flag>>(new Set(['g']));
  const [testString, setTestString] = useState('');
  const [copied, setCopied] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);

  const { regex, error } = useMemo(() => buildRegex(pattern, flags), [pattern, flags]);

  const matches = useMemo(() => {
    if (!regex) return [];
    try {
      return getMatches(regex, testString);
    } catch {
      return [];
    }
  }, [regex, testString]);

  const toggleFlag = (flag: Flag) => {
    setFlags(prev => {
      const next = new Set(prev);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  };

  const handleCopyPattern = async () => {
    if (!pattern) return;
    const flagStr = Array.from(flags).join('');
    const formatted = `/${pattern}/${flagStr}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const insertPattern = (qp: QuickPattern) => {
    setPattern(qp.pattern);
    const newFlags = new Set<Flag>();
    for (const ch of qp.flags) {
      if (['g', 'i', 'm', 's'].includes(ch)) newFlags.add(ch as Flag);
    }
    setFlags(newFlags);
  };

  const flagDefs: { flag: Flag; label: string; title: string }[] = [
    { flag: 'g', label: 'g', title: 'Global — find all matches' },
    { flag: 'i', label: 'i', title: 'Case insensitive' },
    { flag: 'm', label: 'm', title: 'Multiline — ^ and $ match line boundaries' },
    { flag: 's', label: 's', title: 'dotAll — . matches newlines' },
  ];

  const matchCountLabel = (() => {
    if (error) return null;
    if (!pattern) return null;
    if (matches.length === 0) return 'No matches';
    return `${matches.length} match${matches.length !== 1 ? 'es' : ''} found`;
  })();

  const hasNamedGroups = matches.some(m => Object.keys(m.namedGroups).length > 0);
  const hasGroups = matches.some(m => m.groups.length > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-3 mb-1">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Regex Tester</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Test and debug regular expressions with live match highlighting</p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Pattern Input */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Regular Expression</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-mono text-lg select-none">/</span>
                  <Input
                    value={pattern}
                    onChange={e => setPattern(e.target.value)}
                    placeholder="Enter pattern..."
                    className="font-mono flex-1"
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <span className="text-gray-500 font-mono text-lg select-none">/</span>
                  <span className="font-mono text-blue-400 min-w-[2rem]">{Array.from(flags).join('')}</span>
                  <Button onClick={handleCopyPattern} disabled={!pattern} variant="outline" size="sm">
                    {copied ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
                  </Button>
                </div>
              </div>

              {/* Flags */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Flags</label>
                <div className="flex flex-wrap gap-2">
                  {flagDefs.map(({ flag, label, title }) => (
                    <label key={flag} title={title} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] cursor-pointer hover:border-gray-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={flags.has(flag)}
                        onChange={() => toggleFlag(flag)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-mono text-gray-300">{label}</span>
                      <span className="text-xs text-gray-500 hidden sm:inline">{title.split(' — ')[0]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-950/30 border border-red-900">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-400 mb-0.5">Invalid pattern</p>
                    <p className="text-xs text-red-300 font-mono">{error}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test String */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-medium text-gray-300">Test String</label>
                {matchCountLabel && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${matches.length > 0 ? 'bg-green-500/10 text-green-400' : 'text-gray-500'}`}>
                    {matchCountLabel}
                  </span>
                )}
              </div>
              <Textarea
                value={testString}
                onChange={e => setTestString(e.target.value)}
                placeholder="Enter test string..."
                rows={6}
                className="font-mono text-sm"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* Highlighted Preview */}
          {(testString || pattern) && !error && (
            <Card>
              <CardContent className="pt-5">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">Match Highlighting</label>
                <div className="bg-gray-950 rounded-md p-4 min-h-[60px]">
                  <HighlightedText text={testString} regex={regex} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Match Details */}
          {matches.length > 0 && !error && (
            <Card>
              <CardContent className="pt-5">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">
                  Match Details
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsla(0,0%,20%,1)]">
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">#</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Match</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Index</th>
                        {hasGroups && <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Groups</th>}
                        {hasNamedGroups && <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Named Groups</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m, i) => (
                        <tr key={i} className="border-b border-[hsla(0,0%,12%,1)] hover:bg-gray-900/50 transition-colors">
                          <td className="py-2 px-3 text-xs text-gray-500 font-mono">{i + 1}</td>
                          <td className="py-2 px-3">
                            <code className="text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded text-xs font-mono break-all">
                              {m.value === '' ? <span className="text-gray-600 italic">(empty)</span> : m.value}
                            </code>
                          </td>
                          <td className="py-2 px-3 font-mono text-xs text-blue-400">{m.index}</td>
                          {hasGroups && (
                            <td className="py-2 px-3">
                              {m.groups.length === 0 ? (
                                <span className="text-gray-600 text-xs">—</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {m.groups.map((g, gi) => (
                                    <code key={gi} className="text-xs font-mono text-yellow-400 bg-yellow-500/10 px-1 py-0.5 rounded">
                                      {g === undefined ? <span className="text-gray-600 italic">undefined</span> : g}
                                    </code>
                                  ))}
                                </div>
                              )}
                            </td>
                          )}
                          {hasNamedGroups && (
                            <td className="py-2 px-3">
                              {Object.keys(m.namedGroups).length === 0 ? (
                                <span className="text-gray-600 text-xs">—</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(m.namedGroups).map(([k, v]) => (
                                    <span key={k} className="text-xs font-mono">
                                      <span className="text-purple-400">{k}</span>
                                      <span className="text-gray-600">: </span>
                                      <code className="text-yellow-400 bg-yellow-500/10 px-1 py-0.5 rounded">{String(v)}</code>
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
              </CardContent>
            </Card>
          )}

          {/* Quick Reference Accordion */}
          <Card>
            <CardContent className="pt-5">
              <button
                onClick={() => setAccordionOpen(o => !o)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-xs sm:text-sm font-medium text-gray-300">Quick Reference Patterns</span>
                {accordionOpen
                  ? <ChevronDown className="w-4 h-4 text-gray-500" />
                  : <ChevronRight className="w-4 h-4 text-gray-500" />
                }
              </button>
              {accordionOpen && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {QUICK_PATTERNS.map(qp => (
                    <button
                      key={qp.label}
                      onClick={() => insertPattern(qp)}
                      className="flex flex-col items-start gap-1 p-3 rounded-md border border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] hover:border-gray-600 hover:bg-gray-900 transition-colors text-left"
                    >
                      <span className="text-xs font-semibold text-blue-400">{qp.label}</span>
                      <span className="text-xs text-gray-500">{qp.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empty state */}
          {!pattern && !testString && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center text-gray-500 py-8">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Enter a regex pattern and test string to get started</p>
                  <p className="text-xs mt-1 text-gray-600">Use the quick reference below to insert common patterns</p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
