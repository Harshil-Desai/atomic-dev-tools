'use client';
import { useState, ReactNode, CSSProperties } from 'react';

// ── BpPanel ────────────────────────────────────────────────────────────────────
export function BpPanel({
  title,
  meta,
  children,
  className = '',
  style,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`bp-frame bp-frame-bl bp-frame-br ${className}`} style={style}>
      <div className='bp-titleblock'>
        <span className='bp-dot' />
        <span className='font-mono text-xs font-semibold tracking-widest uppercase' style={{ color: 'rgba(255,255,255,0.7)' }}>
          {title}
        </span>
        {meta && (
          <>
            <span className='bp-sep'>—</span>
            <span className='font-mono text-xs' style={{ color: 'rgba(255,255,255,0.3)' }}>{meta}</span>
          </>
        )}
      </div>
      <div className='bp-panel-body'>{children}</div>
    </div>
  );
}

// ── BpStat ─────────────────────────────────────────────────────────────────────
export function BpStat({
  label,
  value,
  labelWidth = 120,
}: {
  label: string;
  value: ReactNode;
  labelWidth?: number;
}) {
  return (
    <div className='bp-stat-row'>
      <span className='bp-stat-label' style={{ minWidth: labelWidth }}>{label}</span>
      <span className='bp-stat-value'>{value}</span>
    </div>
  );
}

// ── BpStatus ───────────────────────────────────────────────────────────────────
export function BpStatus({
  state,
  children,
}: {
  state: 'ok' | 'warn' | 'fail' | 'idle';
  children: ReactNode;
}) {
  return (
    <span className={`bp-status bp-status-${state}`}>{children}</span>
  );
}

// ── BpChip ─────────────────────────────────────────────────────────────────────
export function BpChip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      className='bp-chip'
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      title={title}
      type='button'
    >
      {children}
    </button>
  );
}

// ── BpCopyBtn ──────────────────────────────────────────────────────────────────
export function BpCopyBtn({ text, label = 'COPY' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button className='bp-btn' onClick={handleClick} type='button'>
      {copied ? 'COPIED' : label}
    </button>
  );
}

// ── BpToolStage ────────────────────────────────────────────────────────────────
export function BpToolStage({
  cat,
  children,
}: {
  cat: string;
  children: ReactNode;
}) {
  return (
    <div className='bp-paper h-full flex flex-col overflow-hidden relative' data-cat={cat}>
      <div className='bp-ruler-x' />
      <div className='bp-ruler-y' />
      <div className='flex-1 min-h-0 overflow-auto' style={{ paddingLeft: 20, paddingTop: 18 }}>
        {children}
      </div>
    </div>
  );
}

// ── colorJson ──────────────────────────────────────────────────────────────────
export function colorJson(s: string): ReactNode {
  if (!s) return null;
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;

  // Simple token-based colorizer
  while (i < s.length) {
    // string
    if (s[i] === '"') {
      let j = i + 1;
      while (j < s.length) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '"') { j++; break; }
        j++;
      }
      const raw = s.slice(i, j);
      // Look ahead: if next non-space char is ':', it's a key
      let look = j;
      while (look < s.length && (s[look] === ' ' || s[look] === '\t')) look++;
      if (s[look] === ':') {
        parts.push(<span key={key++} className='bp-jk'>{raw}</span>);
      } else {
        parts.push(<span key={key++} className='bp-js'>{raw}</span>);
      }
      i = j;
      continue;
    }
    // number
    if (/[-\d]/.test(s[i]) && (i === 0 || /[^.\w]/.test(s[i - 1]))) {
      let j = i + 1;
      while (j < s.length && /[\d.eE+\-]/.test(s[j])) j++;
      parts.push(<span key={key++} className='bp-jn'>{s.slice(i, j)}</span>);
      i = j;
      continue;
    }
    // true / false / null
    if (s.slice(i, i + 4) === 'true' || s.slice(i, i + 5) === 'false' || s.slice(i, i + 4) === 'null') {
      const len = s.slice(i, i + 5) === 'false' ? 5 : 4;
      parts.push(<span key={key++} className='bp-jl'>{s.slice(i, i + len)}</span>);
      i += len;
      continue;
    }
    // punctuation / whitespace
    parts.push(<span key={key++} className={/[{}[\],:]/.test(s[i]) ? 'bp-jp' : undefined}>{s[i]}</span>);
    i++;
  }

  return <>{parts}</>;
}
