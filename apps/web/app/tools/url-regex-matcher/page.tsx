'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { Link2, Copy, Check, AlertCircle } from 'lucide-react';

// ─── patterns ─────────────────────────────────────────────────────────────────

const PATTERNS = {
  urls: {
    label: 'URLs',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    regex: /https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+(?:\/(?:[\w\-.~:/?#[\]@!$&'()*+,;=%])*)?/g,
    description: 'http:// and https:// URLs',
  },
  domains: {
    label: 'Domains',
    color: 'bg-green-500/20 text-green-300 border-green-500/40',
    regex: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|dev|app|co|uk|de|fr|jp|cn|au|ca|gov|edu|mil|int|info|biz|name|pro|museum|travel|jobs|mobi|tel|cat|post|xxx|aero|coop|asia|tel|arpa|[a-z]{2})\b/gi,
    description: 'Registered domain names with known TLDs',
  },
  emails: {
    label: 'Emails',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    description: 'Email addresses',
  },
  ipv4: {
    label: 'IPv4',
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\b/g,
    description: 'IPv4 addresses',
  },
  ipv6: {
    label: 'IPv6',
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    regex: /(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|::(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}/g,
    description: 'IPv6 addresses',
  },
} as const;

type PatternKey = keyof typeof PATTERNS;

// ─── sample text ──────────────────────────────────────────────────────────────

const SAMPLE = `Server logs from 2024-01-15:

[INFO] Request from 192.168.1.42 to https://api.example.com/v2/users
[WARN] Failed login attempt for user@company.io from 10.0.0.1
[INFO] Redirect: http://old.myapp.dev/path?query=1#anchor → https://new.myapp.dev/path
[ERROR] Timeout connecting to db.internal.corp:5432 (2001:db8::1)
[INFO] CDN asset loaded from https://cdn.cloudflare.com/assets/app.min.js
[INFO] Webhook sent to https://hooks.slack.com/services/T00/B00/xxxyyy

Contact: support@helpdesk.org | abuse@security.net
Docs: https://docs.example.io/getting-started and https://github.com/org/repo

Blocked IPs: 203.0.113.0, 198.51.100.255, ::1, fe80::1
Trusted: 172.16.0.0, 10.10.10.10`;

// ─── component ────────────────────────────────────────────────────────────────

export default function URLRegexMatcherPage() {
  const [text, setText] = useState(SAMPLE);
  const [enabledPatterns, setEnabledPatterns] = useState<Set<PatternKey>>(
    new Set(['urls', 'emails', 'ipv4'] as PatternKey[])
  );
  const [dedup, setDedup] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

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

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = (key: PatternKey) => handleCopy(results[key].join('\n'), key);
  const copyAllResults = () => {
    const lines = (Object.entries(results) as [PatternKey, string[]][])
      .filter(([, arr]) => arr.length)
      .map(([k, arr]) => `# ${PATTERNS[k].label}\n${arr.join('\n')}`)
      .join('\n\n');
    handleCopy(lines, 'all');
  };

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>URL Regex Matcher</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Extract URLs, domains, emails, and IP addresses from large text blocks</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-5xl mx-auto space-y-4'>

          {/* Controls */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='flex flex-wrap gap-2 items-center'>
                <span className='text-sm font-medium text-gray-300 mr-1'>Extract:</span>
                {(Object.entries(PATTERNS) as [PatternKey, typeof PATTERNS[PatternKey]][]).map(([key, def]) => (
                  <button
                    key={key}
                    onClick={() => togglePattern(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors
                      ${enabledPatterns.has(key) ? def.color : 'bg-[#121212] text-gray-500 border-[hsla(0,0%,15%,1)] hover:border-[hsla(0,0%,30%,1)]'}`}
                  >
                    {def.label}
                  </button>
                ))}
                <label className='flex items-center gap-2 cursor-pointer ml-2'>
                  <input type='checkbox' checked={dedup} onChange={(e) => setDedup(e.target.checked)} className='w-4 h-4 rounded' />
                  <span className='text-sm text-gray-300'>Deduplicate</span>
                </label>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>Input Text</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  className='font-mono text-xs'
                  placeholder='Paste logs, HTML, config files, or any text here…'
                />
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-400'>
                  Found <span className='text-white font-semibold'>{totalMatches}</span> match{totalMatches !== 1 ? 'es' : ''}
                  {dedup ? ' (unique)' : ''}
                </span>
                {totalMatches > 0 && (
                  <Button variant='outline' size='sm' onClick={copyAllResults}>
                    {copied === 'all' ? <><Check className='w-3 h-3 mr-1' />Copied</> : <><Copy className='w-3 h-3 mr-1' />Copy all</>}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results by category */}
          {(Object.entries(results) as [PatternKey, string[]][])
            .filter(([key]) => enabledPatterns.has(key))
            .map(([key, matches]) => {
              const def = PATTERNS[key];
              return (
                <Card key={key}>
                  <CardContent className='pt-6 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${def.color}`}>{def.label}</span>
                        <span className='text-xs text-gray-500'>{def.description}</span>
                        <span className='text-xs font-mono text-gray-400'>{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                      </div>
                      {matches.length > 0 && (
                        <Button variant='outline' size='sm' onClick={() => copyAll(key)}>
                          {copied === key ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                        </Button>
                      )}
                    </div>

                    {matches.length === 0 ? (
                      <div className='flex items-center gap-2 text-gray-600 text-sm py-2'>
                        <AlertCircle className='w-4 h-4' />
                        <span>No {def.label.toLowerCase()} found</span>
                      </div>
                    ) : (
                      <div className='space-y-1 max-h-48 overflow-auto'>
                        {matches.map((match, i) => (
                          <div key={i} className='flex items-center gap-2 group'>
                            <code className='flex-1 font-mono text-xs text-gray-300 bg-[#121212] rounded px-3 py-1.5 truncate'>{match}</code>
                            <Button
                              variant='outline'
                              size='sm'
                              className='opacity-0 group-hover:opacity-100 transition-opacity shrink-0'
                              onClick={() => handleCopy(match, `${key}-${i}`)}
                            >
                              {copied === `${key}-${i}` ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

          {/* Pattern reference */}
          <Card>
            <CardContent className='pt-6 space-y-2'>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Regex Patterns</p>
              <div className='space-y-2'>
                {(Object.entries(PATTERNS) as [PatternKey, typeof PATTERNS[PatternKey]][]).map(([key, def]) => (
                  <div key={key} className='flex gap-2 items-start'>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border shrink-0 ${def.color}`}>{def.label}</span>
                    <code className='text-xs font-mono text-gray-500 break-all'>{def.regex.source}</code>
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
