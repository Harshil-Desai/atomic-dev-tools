'use client';

import { useState, useEffect } from 'react';
import { BpCopyBtn } from '@/components/blueprint';
import { GitCompare } from 'lucide-react';

type DiffView = 'side-by-side' | 'unified';
interface DiffLine { type: 'added' | 'removed' | 'unchanged'; content: string; lineNumber?: number; }

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

export default function FormatAwareDiffPage() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [diffResult, setDiffResult] = useState<{ originalLines: DiffLine[]; modifiedLines: DiffLine[] } | null>(null);
  const [summary, setSummary] = useState<{ added: number; removed: number; unchanged: number } | null>(null);
  const [viewMode, setViewMode] = useState<DiffView>('side-by-side');
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkViewport = () => setIsDesktop(window.innerWidth >= 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const normalizeText = (text: string): string[] =>
    text.split('\n').map((line) => line.trim().replace(/\s+/g, ' ')).filter((line) => line.length > 0);

  const computeDiff = (originalLines: string[], modifiedLines: string[]) => {
    const resultOriginal: DiffLine[] = [], resultModified: DiffLine[] = [];
    let i = 0, j = 0, lineNum = 1;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i < originalLines.length && j < modifiedLines.length) {
        if (originalLines[i] === modifiedLines[j]) {
          resultOriginal.push({ type: 'unchanged', content: originalLines[i], lineNumber: lineNum });
          resultModified.push({ type: 'unchanged', content: modifiedLines[j], lineNumber: lineNum });
          i++; j++; lineNum++;
        } else {
          let foundMatch = false, lookahead = 1;
          while (i + lookahead < originalLines.length && lookahead < 50) {
            if (originalLines[i + lookahead] === modifiedLines[j]) {
              for (let k = 0; k < lookahead; k++) {
                resultOriginal.push({ type: 'removed', content: originalLines[i + k], lineNumber: lineNum + k });
                resultModified.push({ type: 'unchanged', content: '', lineNumber: lineNum + k });
              }
              i += lookahead; foundMatch = true; break;
            }
            lookahead++;
          }
          if (!foundMatch) {
            resultOriginal.push({ type: 'removed', content: originalLines[i], lineNumber: lineNum });
            resultModified.push({ type: 'added', content: modifiedLines[j], lineNumber: lineNum });
            i++; j++; lineNum++;
          }
        }
      } else if (i < originalLines.length) {
        resultOriginal.push({ type: 'removed', content: originalLines[i], lineNumber: lineNum });
        resultModified.push({ type: 'unchanged', content: '', lineNumber: lineNum });
        i++; lineNum++;
      } else {
        resultOriginal.push({ type: 'unchanged', content: '', lineNumber: lineNum });
        resultModified.push({ type: 'added', content: modifiedLines[j], lineNumber: lineNum });
        j++; lineNum++;
      }
    }
    return { originalLines: resultOriginal, modifiedLines: resultModified };
  };

  const handleCompare = () => {
    const diff = computeDiff(normalizeText(original), normalizeText(modified));
    setDiffResult(diff);
    let added = 0, removed = 0, unchanged = 0;
    diff.modifiedLines.forEach((line) => { if (line.type === 'added') added++; else if (line.type === 'unchanged' && line.content) unchanged++; });
    diff.originalLines.forEach((line) => { if (line.type === 'removed') removed++; });
    setSummary({ added, removed, unchanged });
  };

  const getDiffCopyText = () => {
    if (!diffResult) return '';
    return diffResult.modifiedLines.map((line) => line.type === 'added' ? `+ ${line.content}` : line.type === 'removed' ? `- ${line.content}` : `  ${line.content}`).join('\n');
  };

  const lineBgStyle = (type: string): React.CSSProperties => {
    if (type === 'added') return { background: 'rgba(34,197,94,0.08)' };
    if (type === 'removed') return { background: 'rgba(239,68,68,0.08)' };
    return {};
  };
  const lineColorStyle = (type: string): React.CSSProperties => {
    if (type === 'added') return { color: '#4ade80' };
    if (type === 'removed') return { color: '#f87171' };
    return { color: 'var(--bp-ink)' };
  };

  const unifiedLines = diffResult ? (() => {
    const lines: Array<{ type: string; content: string; lineNum?: number }> = [];
    diffResult.originalLines.forEach((origLine, idx) => {
      const modLine = diffResult.modifiedLines[idx];
      if (origLine.type === 'unchanged' && modLine.type === 'unchanged') {
        lines.push({ type: 'unchanged', content: modLine.content, lineNum: modLine.lineNumber });
      } else {
        if (origLine.type === 'removed' && origLine.content) lines.push({ type: 'removed', content: origLine.content, lineNum: origLine.lineNumber });
        if (modLine.type === 'added' && modLine.content) lines.push({ type: 'added', content: modLine.content, lineNum: modLine.lineNumber });
      }
    });
    return lines;
  })() : [];

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
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Format-Aware Diff</h1>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--bp-ink-mute)' }}>Side-by-side diff with added and removed line highlighting</p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Input row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flexShrink: 0, borderBottom: '1px solid var(--bp-border)' }}>
          <Panel title='Original Code' style={{ borderRight: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder='Enter original code here...'
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
                minHeight: 180,
              }}
            />
          </Panel>
          <Panel title='Modified Code' style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
            <textarea
              value={modified}
              onChange={(e) => setModified(e.target.value)}
              placeholder='Enter modified code here...'
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
                minHeight: 180,
              }}
            />
          </Panel>
        </div>

        {/* Controls bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-surface)', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['side-by-side', 'unified'] as DiffView[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                type='button'
                className='bp-btn'
                style={viewMode === m ? { background: 'var(--bp-accent)', color: '#000', borderColor: 'var(--bp-accent)' } : {}}
              >
                {m === 'side-by-side' ? 'SIDE BY SIDE' : 'UNIFIED'}
              </button>
            ))}
          </div>
          <button
            className='bp-btn bp-btn-solid'
            onClick={handleCompare}
            disabled={!original.trim() || !modified.trim()}
            type='button'
          >
            <GitCompare style={{ width: 14, height: 14, marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
            COMPARE
          </button>
        </div>

        {/* Summary bar */}
        {summary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '7px 16px', borderBottom: '1px solid var(--bp-border)', background: 'var(--bp-elevated)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: 'rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.4)' }} />
              <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>{summary.added} lines added</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.4)' }} />
              <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>{summary.removed} lines removed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: 'var(--bp-border-str)' }} />
              <span style={{ fontSize: 11, color: 'var(--bp-ink-mute)' }}>{summary.unchanged} lines unchanged</span>
            </div>
          </div>
        )}

        {/* Diff output — side by side */}
        {diffResult && viewMode === 'side-by-side' && (
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
            <Panel title='Original' style={{ borderRight: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {diffResult.originalLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...lineBgStyle(line.type),
                      ...lineColorStyle(line.type),
                      display: 'flex',
                      gap: 8,
                      padding: '2px 10px',
                      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                      fontSize: 11,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ width: 28, color: 'var(--bp-ink-faint)', flexShrink: 0, textAlign: 'right', userSelect: 'none' }}>{line.lineNumber || ''}</span>
                    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line.content}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title='Modified' style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {diffResult.modifiedLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...lineBgStyle(line.type),
                      ...lineColorStyle(line.type),
                      display: 'flex',
                      gap: 8,
                      padding: '2px 10px',
                      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                      fontSize: 11,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ width: 28, color: 'var(--bp-ink-faint)', flexShrink: 0, textAlign: 'right', userSelect: 'none' }}>{line.lineNumber || ''}</span>
                    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line.content}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
                <BpCopyBtn text={getDiffCopyText()} label='COPY DIFF' />
              </div>
            </Panel>
          </div>
        )}

        {/* Diff output — unified */}
        {diffResult && viewMode === 'unified' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Panel title='Unified Diff' style={{ flex: 1, borderTop: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {unifiedLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...lineBgStyle(line.type),
                      ...lineColorStyle(line.type),
                      display: 'flex',
                      gap: 8,
                      padding: '2px 10px',
                      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                      fontSize: 11,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ width: 36, color: 'var(--bp-ink-faint)', flexShrink: 0, userSelect: 'none' }}>
                      {line.type === 'added' ? `+${line.lineNum}` : line.type === 'removed' ? `-${line.lineNum}` : line.lineNum}
                    </span>
                    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {line.type === 'removed' ? '- ' : line.type === 'added' ? '+ ' : '  '}{line.content}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px dashed var(--bp-border-str)', flexShrink: 0 }}>
                <BpCopyBtn text={getDiffCopyText()} label='COPY DIFF' />
              </div>
            </Panel>
          </div>
        )}

      </div>
    </div>
  );
}
