'use client';

import { useState } from 'react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';
import { GitCompare } from 'lucide-react';

type DiffView = 'side-by-side' | 'unified';
interface DiffLine { type: 'added' | 'removed' | 'unchanged'; content: string; lineNumber?: number; }

export default function FormatAwareDiffPage() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [diffResult, setDiffResult] = useState<{ originalLines: DiffLine[]; modifiedLines: DiffLine[] } | null>(null);
  const [summary, setSummary] = useState<{ added: number; removed: number; unchanged: number } | null>(null);
  const [viewMode, setViewMode] = useState<DiffView>('side-by-side');

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

  const lineBg = (type: string) => type === 'added' ? 'bg-green-900/30' : type === 'removed' ? 'bg-red-900/30' : '';
  const lineColor = (type: string) => type === 'added' ? 'text-green-400' : type === 'removed' ? 'text-red-400' : 'text-gray-300';

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

  return (
    <BpToolStage cat='text'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Format-Aware Diff</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Compare two code blocks with normalized whitespace and formatting</p>
      </div>

      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-7xl mx-auto space-y-4'>

          <div className='bp-layout-2col'>
            <BpPanel title='Original Code'>
              <textarea className='bp-textarea font-mono text-sm' placeholder='Enter original code here...' value={original} onChange={(e) => setOriginal(e.target.value)} rows={12} />
            </BpPanel>
            <BpPanel title='Modified Code'>
              <textarea className='bp-textarea font-mono text-sm' placeholder='Enter modified code here...' value={modified} onChange={(e) => setModified(e.target.value)} rows={12} />
            </BpPanel>
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex gap-2'>
              {(['side-by-side', 'unified'] as DiffView[]).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} type='button'
                  className={`px-3 py-1.5 text-sm rounded border transition-colors ${viewMode === m ? 'bg-blue-600 text-white border-blue-600' : 'border-[hsla(0,0%,20%,1)] text-gray-400 hover:text-gray-200'}`}>
                  {m === 'side-by-side' ? 'Side by Side' : 'Unified'}
                </button>
              ))}
            </div>
            <button className='bp-btn bp-btn-solid' onClick={handleCompare} disabled={!original.trim() || !modified.trim()} type='button'>
              <GitCompare className='w-4 h-4 mr-2 inline' />COMPARE
            </button>
          </div>

          {summary && (
            <BpPanel title='Summary'>
              <div className='flex items-center gap-6 text-sm'>
                <div className='flex items-center gap-2'><div className='w-3 h-3 bg-green-900/50 rounded' /><span className='text-gray-400'>{summary.added} lines added</span></div>
                <div className='flex items-center gap-2'><div className='w-3 h-3 bg-red-900/50 rounded' /><span className='text-gray-400'>{summary.removed} lines removed</span></div>
                <div className='flex items-center gap-2'><div className='w-3 h-3 bg-gray-700 rounded' /><span className='text-gray-400'>{summary.unchanged} lines unchanged</span></div>
              </div>
            </BpPanel>
          )}

          {diffResult && viewMode === 'side-by-side' && (
            <div className='bp-layout-2col'>
              <BpPanel title='Original'>
                <div className='bp-code-view max-h-96 overflow-auto'>
                  {diffResult.originalLines.map((line, idx) => (
                    <div key={idx} className={`${lineBg(line.type)} ${lineColor(line.type)} flex gap-2 px-2 py-0.5 font-mono text-xs`}>
                      <span className='w-8 text-gray-600 shrink-0'>{line.lineNumber || ''}</span>
                      <span>{line.content}</span>
                    </div>
                  ))}
                </div>
              </BpPanel>
              <BpPanel title='Modified'>
                <div className='bp-panel-actions mb-2'><BpCopyBtn text={getDiffCopyText()} label='COPY DIFF' /></div>
                <div className='bp-code-view max-h-96 overflow-auto'>
                  {diffResult.modifiedLines.map((line, idx) => (
                    <div key={idx} className={`${lineBg(line.type)} ${lineColor(line.type)} flex gap-2 px-2 py-0.5 font-mono text-xs`}>
                      <span className='w-8 text-gray-600 shrink-0'>{line.lineNumber || ''}</span>
                      <span>{line.content}</span>
                    </div>
                  ))}
                </div>
              </BpPanel>
            </div>
          )}

          {diffResult && viewMode === 'unified' && (
            <BpPanel title='Unified Diff'>
              <div className='bp-panel-actions mb-2'><BpCopyBtn text={getDiffCopyText()} label='COPY DIFF' /></div>
              <div className='bp-code-view max-h-96 overflow-auto'>
                {unifiedLines.map((line, idx) => (
                  <div key={idx} className={`${lineBg(line.type)} ${lineColor(line.type)} flex gap-2 px-2 py-0.5 font-mono text-xs`}>
                    <span className='w-12 text-gray-600 shrink-0'>{line.type === 'added' ? `+${line.lineNum}` : line.type === 'removed' ? `-${line.lineNum}` : line.lineNum}</span>
                    <span>{line.type === 'removed' ? '- ' : line.type === 'added' ? '+ ' : '  '}{line.content}</span>
                  </div>
                ))}
              </div>
            </BpPanel>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
