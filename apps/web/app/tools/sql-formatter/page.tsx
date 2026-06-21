'use client';

import React, { useState } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { LayoutList, AlertCircle } from 'lucide-react';

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
interface Token { type: TokenType; value: string; }

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    if (/\s/.test(sql[i])) { let j = i; while (j < sql.length && /\s/.test(sql[j])) j++; tokens.push({ type: 'ws', value: sql.slice(i, j) }); i = j; continue; }
    if (sql[i] === '-' && sql[i + 1] === '-') { let j = i; while (j < sql.length && sql[j] !== '\n') j++; tokens.push({ type: 'comment', value: sql.slice(i, j) }); i = j; continue; }
    if (sql[i] === '/' && sql[i + 1] === '*') { let j = i + 2; while (j < sql.length && !(sql[j] === '*' && sql[j + 1] === '/')) j++; tokens.push({ type: 'comment', value: sql.slice(i, j + 2) }); i = j + 2; continue; }
    if (sql[i] === "'" || sql[i] === '"' || sql[i] === '`') {
      const quote = sql[i]; let j = i + 1;
      while (j < sql.length) { if (sql[j] === '\\') { j += 2; continue; } if (sql[j] === quote) { j++; break; } j++; }
      tokens.push({ type: 'string', value: sql.slice(i, j) }); i = j; continue;
    }
    if (sql[i] === '$') {
      const match = sql.slice(i).match(/^\$([^$]*)\$/);
      if (match) { const tag = match[0]; const end = sql.indexOf(tag, i + tag.length); if (end !== -1) { tokens.push({ type: 'string', value: sql.slice(i, end + tag.length) }); i = end + tag.length; continue; } }
    }
    if (/\d/.test(sql[i]) || (sql[i] === '.' && /\d/.test(sql[i + 1] || ''))) { let j = i; while (j < sql.length && /[\d._eE+\-x]/.test(sql[j])) j++; tokens.push({ type: 'number', value: sql.slice(i, j) }); i = j; continue; }
    if (sql[i] === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }
    if (sql[i] === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue; }
    if (sql[i] === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue; }
    if (sql[i] === ';') { tokens.push({ type: 'semicolon', value: ';' }); i++; continue; }
    if (/[a-zA-Z_@#]/.test(sql[i])) { let j = i; while (j < sql.length && /[a-zA-Z0-9_$@#.]/.test(sql[j])) j++; tokens.push({ type: 'ident', value: sql.slice(i, j) }); i = j; continue; }
    tokens.push({ type: 'op', value: sql[i] }); i++;
  }
  return tokens.filter((t) => t.type !== 'ws');
}

// ─── formatter ────────────────────────────────────────────────────────────────

interface FormatOptions { indentSize: number; uppercase: boolean; dialect: string; }

function formatSQL(sql: string, opts: FormatOptions): string {
  const { indentSize, uppercase } = opts;
  const indent = ' '.repeat(indentSize);
  const tokens = tokenize(sql);
  let i = 0;
  const normalizeKeyword = (s: string) => uppercase ? s.toUpperCase() : s.toLowerCase();
  const processed: string[] = [];
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === 'comment') { processed.push(tok.value); i++; continue; }
    if (tok.type !== 'ident') { processed.push(tok.value); i++; continue; }
    const remaining = tokens.slice(i).filter(t => t.type !== 'ws').map(t => t.value.toUpperCase());
    let matched = '';
    for (const kw of [...TOP_LEVEL, ...Array.from(INLINE_KEYWORDS)].sort((a, b) => b.length - a.length)) {
      const words = kw.split(' ');
      const slice = remaining.slice(0, words.length).join(' ');
      if (slice === kw) { matched = kw; break; }
    }
    if (matched) {
      processed.push(normalizeKeyword(matched));
      const wordCount = matched.split(' ').length;
      let skipped = 0;
      while (skipped < wordCount && i < tokens.length) { if (tokens[i].type !== 'ws') skipped++; i++; }
    } else { processed.push(tok.value); i++; }
  }
  const isTopLevel = (w: string) => TOP_LEVEL.includes(w.toUpperCase());
  const out: string[] = [];
  let lineDepth = 0;
  for (let j = 0; j < processed.length; j++) {
    const word = processed[j];
    const up = word.toUpperCase();
    if (word === '(') { lineDepth++; out.push('('); continue; }
    if (word === ')') { lineDepth--; out.push(')'); continue; }
    if (word === ';') { out.push(';\n'); continue; }
    if (word === ',') { if (lineDepth === 0) out.push(',\n' + indent); else out.push(', '); continue; }
    if (lineDepth === 0 && isTopLevel(word)) {
      const needsNewLine = out.length > 0 && !out[out.length - 1].endsWith('\n');
      if (needsNewLine) out.push('\n');
      out.push(word + ' '); continue;
    }
    if (lineDepth === 0 && (up === 'AND' || up === 'OR')) {
      const nl = !out[out.length - 1]?.endsWith('\n');
      if (nl) out.push('\n' + indent);
      out.push(word + ' '); continue;
    }
    out.push(word + ' ');
  }
  return out.join('').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── linter ───────────────────────────────────────────────────────────────────

interface LintWarning { severity: 'warn' | 'error'; message: string; }

function lintSQL(sql: string): LintWarning[] {
  const warnings: LintWarning[] = [];
  const up = sql.toUpperCase();
  if (/SELECT\s+\*/i.test(sql)) warnings.push({ severity: 'warn', message: 'SELECT * can harm performance and maintainability — consider listing explicit columns.' });
  if (/DELETE\s+FROM\s+\w+\s*;?\s*$/i.test(sql.trim()) && !/WHERE/i.test(sql)) warnings.push({ severity: 'error', message: 'DELETE without WHERE will delete all rows.' });
  if (/UPDATE\s+\w+\s+SET/i.test(sql) && !/WHERE/i.test(sql)) warnings.push({ severity: 'warn', message: 'UPDATE without WHERE will update all rows.' });
  if (/OR\s+1\s*=\s*1/i.test(sql) || /OR\s+'1'\s*=\s*'1'/i.test(sql)) warnings.push({ severity: 'error', message: 'Possible SQL injection pattern detected (OR 1=1).' });
  if ((up.match(/JOIN/g) || []).length > 5) warnings.push({ severity: 'warn', message: 'More than 5 JOINs — consider breaking into CTEs or views for readability.' });
  if (/NOT IN\s*\(/i.test(sql)) warnings.push({ severity: 'warn', message: 'NOT IN with NULL values can return unexpected results. Consider NOT EXISTS.' });
  if (/LIKE\s+'%[^']+'/i.test(sql)) warnings.push({ severity: 'warn', message: 'Leading wildcard in LIKE \'%...\' prevents index usage — expect a full table scan.' });
  return warnings;
}

const EXAMPLES = [
  { label: 'SELECT with JOIN', sql: `SELECT u.id, u.name, u.email, o.total, o.created_at FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE o.total > 100 AND u.active = true ORDER BY o.created_at DESC LIMIT 50;` },
  { label: 'INSERT', sql: `INSERT INTO products (name, price, category_id, in_stock) VALUES ('Widget', 9.99, 3, true);` },
  { label: 'UPDATE', sql: `UPDATE users SET last_login = NOW(), login_count = login_count + 1, updated_at = NOW() WHERE id = 42;` },
];

// ─── blueprint design ─────────────────────────────────────────────────────────

const CSS_VARS: React.CSSProperties = {
  '--bp-bg': '#0a0e14',
  '--bp-surface': '#0f141c',
  '--bp-elevated': '#131a24',
  '--bp-border': '#1e2d3d',
  '--bp-border-str': '#2a3a52',
  '--bp-ink': '#cfd8e3',
  '--bp-ink-mute': '#6b7a8c',
  '--bp-ink-faint': '#3a4554',
  '--bp-accent': '#c792ea',
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

// ─── component ────────────────────────────────────────────────────────────────

export default function SQLFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [uppercase, setUppercase] = useState(true);
  const [dialect, setDialect] = useState('standard');
  const [warnings, setWarnings] = useState<LintWarning[]>([]);

  const handleFormat = () => {
    if (!input.trim()) return;
    setOutput(formatSQL(input, { indentSize, uppercase, dialect }));
    setWarnings(lintSQL(input));
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      data-cat='backend'
      style={{ ...CSS_VARS, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', background: 'var(--bp-bg)', color: 'var(--bp-ink)' }}
    >
      {/* Header */}
      <div className='p-4 sm:p-5 md:p-6 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0'>
        <h1 className='text-sm sm:text-base font-semibold text-white m-0 mb-1'>SQL Formatter</h1>
        <p className='text-xs sm:text-sm text-[var(--bp-ink-mute)] m-0'>Format and beautify SQL queries with syntax highlighting</p>
      </div>

      {/* Options bar */}
      <div className='p-2 sm:p-3 border-b border-[var(--bp-border)] bg-[var(--bp-surface)] flex-shrink-0 flex flex-wrap gap-2 sm:gap-4 items-end' style={{ gap: 16 }}>
        {/* Indent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Indent</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[2, 4].map((n) => (
              <button
                key={n}
                type='button'
                onClick={() => setIndentSize(n)}
                className='bp-chip min-h-10 px-3 py-2'
                style={indentSize === n ? { background: 'var(--bp-accent)', color: '#000', borderColor: 'var(--bp-accent)' } : {}}
              >
                {n} spaces
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Keywords</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type='button'
              onClick={() => setUppercase(true)}
              className='bp-chip min-h-10 px-3 py-2'
              style={uppercase ? { background: 'var(--bp-accent)', color: '#000', borderColor: 'var(--bp-accent)' } : {}}
            >
              UPPERCASE
            </button>
            <button
              type='button'
              onClick={() => setUppercase(false)}
              className='bp-chip min-h-10 px-3 py-2'
              style={!uppercase ? { background: 'var(--bp-accent)', color: '#000', borderColor: 'var(--bp-accent)' } : {}}
            >
              lowercase
            </button>
          </div>
        </div>

        {/* Dialect */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Dialect</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[['standard', 'Standard'], ['postgresql', 'PostgreSQL'], ['mysql', 'MySQL'], ['sqlite', 'SQLite']].map(([d, label]) => (
              <button
                key={d}
                type='button'
                onClick={() => setDialect(d)}
                className='bp-chip min-h-10 px-3 py-2'
                style={dialect === d ? { background: 'var(--bp-accent)', color: '#000', borderColor: 'var(--bp-accent)' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Examples */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bp-ink-mute)' }}>Examples</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type='button'
                onClick={() => setInput(ex.sql)}
                className='bp-chip min-h-10 px-3 py-2'
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className='grid grid-cols-1 lg:grid-cols-2' style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Input panel */}
        <Panel title='Input SQL' style={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Paste raw SQL here…'
              style={{ flex: 1, width: '100%', background: 'var(--bp-bg)', border: 0, color: 'var(--bp-ink)', fontFamily: 'inherit', fontSize: 12, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.65, minHeight: 200 }}
            />
          </div>
          <div className='p-2 sm:p-3 flex items-center gap-2 sm:gap-1 flex-shrink-0' style={{ borderTop: '1px dashed var(--bp-border-str)' }}>
            <button
              type='button'
              className='bp-btn bp-btn-solid min-h-10 px-3 py-2'
              onClick={handleFormat}
              disabled={!input.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LayoutList style={{ width: 14, height: 14 }} />
              FORMAT SQL
            </button>
          </div>
        </Panel>

        {/* Output panel */}
        <Panel title='Formatted Output' style={{ borderTop: 0, borderBottom: 0, borderRight: 0 }}>
          {output && (
            <div className='p-1 sm:p-2 flex items-center gap-2 sm:gap-1 flex-shrink-0' style={{ borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)' }}>
              <BpCopyBtn text={output} label='COPY' />
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <pre style={{ margin: 0, padding: '12px 14px', fontFamily: 'inherit', fontSize: 12, color: 'var(--bp-ink)', whiteSpace: 'pre', lineHeight: 1.65 }}>
              {output || <span style={{ color: 'var(--bp-ink-faint)' }}>Formatted SQL will appear here…</span>}
            </pre>
          </div>
        </Panel>
      </div>

      {/* Lint warnings */}
      {warnings.length > 0 && (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--bp-border)' }}>
          <Panel title='Lint Warnings' meta={`${warnings.length} issue${warnings.length !== 1 ? 's' : ''}`} style={{ border: 0 }}>
            <div className='p-2 sm:p-3 flex flex-col gap-1 sm:gap-1' style={{}}>
              {warnings.map((w, i) => (
                <div key={i} className='flex items-start gap-2 sm:gap-1' style={{ fontSize: 12, color: w.severity === 'error' ? '#f87171' : '#fbbf24' }}>
                  <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
