'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { LayoutList, Copy, Check, AlertCircle } from 'lucide-react';

// ─── SQL keywords ─────────────────────────────────────────────────────────────

const TOP_LEVEL = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'INNER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
  'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN',
  'ON', 'UNION ALL', 'UNION', 'INTERSECT', 'EXCEPT',
  'INSERT INTO', 'INSERT', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'DELETE',
  'CREATE TABLE', 'CREATE INDEX', 'CREATE VIEW', 'ALTER TABLE', 'DROP TABLE',
  'DROP INDEX', 'TRUNCATE', 'WITH',
];

const INLINE_KEYWORDS = new Set([
  'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ILIKE', 'BETWEEN', 'IS', 'NULL',
  'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'ALL',
  'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST', 'PRIMARY KEY', 'FOREIGN KEY',
  'REFERENCES', 'DEFAULT', 'NOT NULL', 'UNIQUE', 'INDEX', 'IF NOT EXISTS', 'IF EXISTS',
  'RETURNING', 'CONFLICT', 'DO NOTHING', 'DO UPDATE',
]);

// ─── tokenizer ────────────────────────────────────────────────────────────────

type TokenType = 'keyword' | 'string' | 'number' | 'ident' | 'op' | 'comma' | 'lparen' | 'rparen' | 'semicolon' | 'ws' | 'comment';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    // Whitespace
    if (/\s/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      tokens.push({ type: 'ws', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Block comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let j = i + 2;
      while (j < sql.length && !(sql[j] === '*' && sql[j + 1] === '/')) j++;
      tokens.push({ type: 'comment', value: sql.slice(i, j + 2) });
      i = j + 2;
      continue;
    }
    // String literals (single-quoted, double-quoted, backtick)
    if (sql[i] === "'" || sql[i] === '"' || sql[i] === '`') {
      const quote = sql[i];
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === '\\') { j += 2; continue; }
        if (sql[j] === quote) { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Dollar-quoted strings (PostgreSQL)
    if (sql[i] === '$') {
      const match = sql.slice(i).match(/^\$([^$]*)\$/);
      if (match) {
        const tag = match[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end !== -1) {
          tokens.push({ type: 'string', value: sql.slice(i, end + tag.length) });
          i = end + tag.length;
          continue;
        }
      }
    }
    // Numbers
    if (/\d/.test(sql[i]) || (sql[i] === '.' && /\d/.test(sql[i + 1] || ''))) {
      let j = i;
      while (j < sql.length && /[\d._eE+\-x]/.test(sql[j])) j++;
      tokens.push({ type: 'number', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Special single chars
    if (sql[i] === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }
    if (sql[i] === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue; }
    if (sql[i] === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue; }
    if (sql[i] === ';') { tokens.push({ type: 'semicolon', value: ';' }); i++; continue; }
    // Operators and identifiers
    if (/[a-zA-Z_@#]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[a-zA-Z0-9_$@#.]/.test(sql[j])) j++;
      tokens.push({ type: 'ident', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Everything else: operators
    tokens.push({ type: 'op', value: sql[i] });
    i++;
  }

  return tokens.filter((t) => t.type !== 'ws');
}

// ─── formatter ────────────────────────────────────────────────────────────────

interface FormatOptions {
  indentSize: number;
  uppercase: boolean;
  dialect: string;
}

function formatSQL(sql: string, opts: FormatOptions): string {
  const { indentSize, uppercase } = opts;
  const indent = ' '.repeat(indentSize);

  const tokens = tokenize(sql);
  const parts: string[] = [];
  let depth = 0; // paren depth
  let i = 0;

  const normalizeKeyword = (s: string) => uppercase ? s.toUpperCase() : s.toLowerCase();

  // Rebuild as flat token list with uppercase identifiers where they're keywords
  const processed: string[] = [];

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.type === 'comment') {
      processed.push(tok.value);
      i++;
      continue;
    }

    if (tok.type !== 'ident') {
      processed.push(tok.value);
      i++;
      continue;
    }

    // Try to match multi-word keywords greedily
    const remaining = tokens.slice(i).filter(t => t.type !== 'ws').map(t => t.value.toUpperCase());
    let matched = '';
    for (const kw of [...TOP_LEVEL, ...Array.from(INLINE_KEYWORDS)].sort((a, b) => b.length - a.length)) {
      const words = kw.split(' ');
      const slice = remaining.slice(0, words.length).join(' ');
      if (slice === kw) {
        matched = kw;
        break;
      }
    }

    if (matched) {
      processed.push(normalizeKeyword(matched));
      // skip matched tokens
      const wordCount = matched.split(' ').length;
      let skipped = 0;
      while (skipped < wordCount && i < tokens.length) {
        if (tokens[i].type !== 'ws') skipped++;
        i++;
      }
    } else {
      processed.push(tok.value);
      i++;
    }
  }

  // Now layout
  const isTopLevel = (w: string) => TOP_LEVEL.includes(w.toUpperCase());

  const out: string[] = [];
  let lineDepth = 0;

  for (let j = 0; j < processed.length; j++) {
    const word = processed[j];
    const up = word.toUpperCase();

    if (word === '(') {
      lineDepth++;
      out.push('(');
      continue;
    }
    if (word === ')') {
      lineDepth--;
      out.push(')');
      continue;
    }
    if (word === ';') {
      out.push(';\n');
      continue;
    }
    if (word === ',') {
      if (lineDepth === 0) {
        out.push(',\n' + indent);
      } else {
        out.push(', ');
      }
      continue;
    }

    if (lineDepth === 0 && isTopLevel(word)) {
      // Top-level clause: start new line, no indent for the keyword itself
      const needsNewLine = out.length > 0 && !out[out.length - 1].endsWith('\n');
      if (needsNewLine) out.push('\n');
      out.push(word + ' ');
      continue;
    }

    // AND/OR in WHERE context (lineDepth 0)
    if (lineDepth === 0 && (up === 'AND' || up === 'OR')) {
      const nl = !out[out.length - 1]?.endsWith('\n');
      if (nl) out.push('\n' + indent);
      out.push(word + ' ');
      continue;
    }

    out.push(word + ' ');
  }

  return out.join('').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── linter ───────────────────────────────────────────────────────────────────

interface LintWarning {
  severity: 'warn' | 'error';
  message: string;
}

function lintSQL(sql: string): LintWarning[] {
  const warnings: LintWarning[] = [];
  const up = sql.toUpperCase();

  if (/SELECT\s+\*/i.test(sql)) {
    warnings.push({ severity: 'warn', message: 'SELECT * can harm performance and maintainability — consider listing explicit columns.' });
  }
  if (/DELETE\s+FROM\s+\w+\s*;?\s*$/i.test(sql.trim()) && !/WHERE/i.test(sql)) {
    warnings.push({ severity: 'error', message: 'DELETE without WHERE will delete all rows.' });
  }
  if (/UPDATE\s+\w+\s+SET/i.test(sql) && !/WHERE/i.test(sql)) {
    warnings.push({ severity: 'warn', message: 'UPDATE without WHERE will update all rows.' });
  }
  if (/OR\s+1\s*=\s*1/i.test(sql) || /OR\s+'1'\s*=\s*'1'/i.test(sql)) {
    warnings.push({ severity: 'error', message: 'Possible SQL injection pattern detected (OR 1=1).' });
  }
  if ((up.match(/JOIN/g) || []).length > 5) {
    warnings.push({ severity: 'warn', message: 'More than 5 JOINs — consider breaking into CTEs or views for readability.' });
  }
  if (/NOT IN\s*\(/i.test(sql)) {
    warnings.push({ severity: 'warn', message: 'NOT IN with NULL values can return unexpected results. Consider NOT EXISTS.' });
  }
  if (/LIKE\s+'%[^']+'/i.test(sql)) {
    warnings.push({ severity: 'warn', message: 'Leading wildcard in LIKE \'%...\' prevents index usage — expect a full table scan.' });
  }

  return warnings;
}

// ─── examples ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    label: 'SELECT with JOIN',
    sql: `SELECT u.id, u.name, u.email, o.total, o.created_at FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE o.total > 100 AND u.active = true ORDER BY o.created_at DESC LIMIT 50;`,
  },
  {
    label: 'INSERT',
    sql: `INSERT INTO products (name, price, category_id, in_stock) VALUES ('Widget', 9.99, 3, true);`,
  },
  {
    label: 'UPDATE',
    sql: `UPDATE users SET last_login = NOW(), login_count = login_count + 1, updated_at = NOW() WHERE id = 42;`,
  },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function SQLFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [uppercase, setUppercase] = useState(true);
  const [dialect, setDialect] = useState('standard');
  const [warnings, setWarnings] = useState<LintWarning[]>([]);
  const [copied, setCopied] = useState(false);

  const handleFormat = () => {
    if (!input.trim()) return;
    const formatted = formatSQL(input, { indentSize, uppercase, dialect });
    setOutput(formatted);
    setWarnings(lintSQL(input));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>SQL Formatter & Linter</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Pretty-print SQL with keyword normalization and basic lint warnings</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-5xl mx-auto space-y-4'>

          {/* Options */}
          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='flex flex-wrap gap-6 items-end'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Indent</label>
                  <div className='flex gap-2'>
                    {[2, 4].map((n) => (
                      <Button key={n} size='sm' variant={indentSize === n ? 'default' : 'outline'} onClick={() => setIndentSize(n)}>
                        {n} spaces
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Keywords</label>
                  <div className='flex gap-2'>
                    <Button size='sm' variant={uppercase ? 'default' : 'outline'} onClick={() => setUppercase(true)}>UPPERCASE</Button>
                    <Button size='sm' variant={!uppercase ? 'default' : 'outline'} onClick={() => setUppercase(false)}>lowercase</Button>
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Dialect</label>
                  <div className='flex gap-2'>
                    {['standard', 'postgresql', 'mysql', 'sqlite'].map((d) => (
                      <Button key={d} size='sm' variant={dialect === d ? 'default' : 'outline'} onClick={() => setDialect(d)}>
                        {d === 'standard' ? 'Standard' : d === 'postgresql' ? 'PostgreSQL' : d === 'mysql' ? 'MySQL' : 'SQLite'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-2'>Examples</p>
                <div className='flex gap-2 flex-wrap'>
                  {EXAMPLES.map((ex) => (
                    <button key={ex.label} onClick={() => setInput(ex.sql)}
                      className='text-xs px-3 py-1.5 rounded border border-[hsla(0,0%,20%,1)] bg-[#121212] hover:bg-[#222] text-gray-300 transition-colors'>
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* I/O */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            <Card>
              <CardContent className='pt-6 space-y-3'>
                <label className='block text-sm font-medium text-gray-300'>Input SQL</label>
                <Textarea value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder='Paste raw SQL here…' rows={18} className='font-mono text-xs' />
                <Button onClick={handleFormat} disabled={!input.trim()} className='w-full'>
                  <LayoutList className='w-4 h-4 mr-2' />
                  Format SQL
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='pt-6 space-y-3'>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-300'>Formatted Output</label>
                  {output && (
                    <Button variant='outline' size='sm' onClick={handleCopy}>
                      {copied ? <><Check className='w-3 h-3 mr-1' />Copied</> : <><Copy className='w-3 h-3 mr-1' />Copy</>}
                    </Button>
                  )}
                </div>
                <pre className='min-h-64 bg-[#121212] rounded-md p-4 font-mono text-xs text-gray-300 overflow-auto whitespace-pre'>
                  {output || <span className='text-gray-600'>Formatted SQL will appear here…</span>}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Lint warnings */}
          {warnings.length > 0 && (
            <Card>
              <CardContent className='pt-6 space-y-2'>
                <p className='text-xs text-gray-500 uppercase tracking-wide'>Lint Warnings</p>
                {warnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-2 text-sm ${w.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                    <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
                    <span>{w.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
