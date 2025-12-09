'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea } from '@/ui';
import { GitCompare, Copy, Check, ArrowRightLeft } from 'lucide-react';

type DiffView = 'side-by-side' | 'unified';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

export default function FormatAwareDiffPage() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [diffResult, setDiffResult] = useState<{ originalLines: DiffLine[]; modifiedLines: DiffLine[] } | null>(null);
  const [summary, setSummary] = useState<{ added: number; removed: number; unchanged: number } | null>(null);
  const [viewMode, setViewMode] = useState<DiffView>('side-by-side');
  const [copied, setCopied] = useState(false);

  const normalizeText = (text: string): string[] => {
    return text
      .split('\n')
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter((line) => line.length > 0);
  };

  const computeDiff = (
    originalLines: string[],
    modifiedLines: string[],
  ): { originalLines: DiffLine[]; modifiedLines: DiffLine[] } => {
    const resultOriginal: DiffLine[] = [];
    const resultModified: DiffLine[] = [];

    let i = 0;
    let j = 0;
    let lineNum = 1;

    while (i < originalLines.length || j < modifiedLines.length) {
      if (i < originalLines.length && j < modifiedLines.length) {
        if (originalLines[i] === modifiedLines[j]) {
          // Unchanged line
          resultOriginal.push({ type: 'unchanged', content: originalLines[i], lineNumber: lineNum });
          resultModified.push({ type: 'unchanged', content: modifiedLines[j], lineNumber: lineNum });
          i++;
          j++;
          lineNum++;
        } else {
          // Lines differ - check if modified line exists in remaining original lines
          let foundMatch = false;
          let lookahead = 1;

          while (i + lookahead < originalLines.length && lookahead < 50) {
            if (originalLines[i + lookahead] === modifiedLines[j]) {
              // Found match ahead - mark skipped lines as removed
              for (let k = 0; k < lookahead; k++) {
                resultOriginal.push({ type: 'removed', content: originalLines[i + k], lineNumber: lineNum + k });
                resultModified.push({ type: 'unchanged', content: '', lineNumber: lineNum + k });
              }
              i += lookahead;
              foundMatch = true;
              break;
            }
            lookahead++;
          }

          if (!foundMatch) {
            // Mark modified line as added and original as removed
            resultOriginal.push({ type: 'removed', content: originalLines[i], lineNumber: lineNum });
            resultModified.push({ type: 'added', content: modifiedLines[j], lineNumber: lineNum });
            i++;
            j++;
            lineNum++;
          }
        }
      } else if (i < originalLines.length) {
        // Remaining original lines
        resultOriginal.push({ type: 'removed', content: originalLines[i], lineNumber: lineNum });
        resultModified.push({ type: 'unchanged', content: '', lineNumber: lineNum });
        i++;
        lineNum++;
      } else {
        // Remaining modified lines
        resultOriginal.push({ type: 'unchanged', content: '', lineNumber: lineNum });
        resultModified.push({ type: 'added', content: modifiedLines[j], lineNumber: lineNum });
        j++;
        lineNum++;
      }
    }

    return { originalLines: resultOriginal, modifiedLines: resultModified };
  };

  const handleCompare = () => {
    const originalLines = normalizeText(original);
    const modifiedLines = normalizeText(modified);

    const diff = computeDiff(originalLines, modifiedLines);
    setDiffResult(diff);

    // Calculate summary
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diff.modifiedLines.forEach((line) => {
      if (line.type === 'added') added++;
      else if (line.type === 'unchanged' && line.content) unchanged++;
    });

    diff.originalLines.forEach((line) => {
      if (line.type === 'removed') removed++;
    });

    setSummary({ added, removed, unchanged });
  };

  const handleCopy = async () => {
    if (!diffResult) return;

    const copyText = diffResult.modifiedLines
      .map((line) => {
        if (line.type === 'added') return `+ ${line.content}`;
        if (line.type === 'removed') return `- ${line.content}`;
        return `  ${line.content}`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy');
    }
  };

  const getLineBackgroundColor = (type: string) => {
    if (type === 'added') return 'bg-green-900/30';
    if (type === 'removed') return 'bg-red-900/30';
    return 'bg-gray-950';
  };

  const getLineTextColor = (type: string) => {
    if (type === 'added') return 'text-green-400';
    if (type === 'removed') return 'text-red-400';
    return 'text-gray-300';
  };

  const renderUnifiedDiff = () => {
    if (!diffResult) return null;

    const unifiedLines: Array<{ type: string; content: string; originalLine?: number; modifiedLine?: number }> = [];

    diffResult.originalLines.forEach((origLine, idx) => {
      const modLine = diffResult.modifiedLines[idx];
      if (origLine.type === 'unchanged' && modLine.type === 'unchanged') {
        unifiedLines.push({ type: 'unchanged', content: modLine.content, modifiedLine: modLine.lineNumber });
      } else {
        if (origLine.type === 'removed' && origLine.content) {
          unifiedLines.push({ type: 'removed', content: origLine.content, originalLine: origLine.lineNumber });
        }
        if (modLine.type === 'added' && modLine.content) {
          unifiedLines.push({ type: 'added', content: modLine.content, modifiedLine: modLine.lineNumber });
        }
      }
    });

    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-semibold text-gray-300'>Unified Diff</h3>
            <Button onClick={handleCopy} variant='outline' size='sm' disabled={!diffResult}>
              {copied ? <Check className='w-4 h-4 mr-2' /> : <Copy className='w-4 h-4 mr-2' />}
              Copy Diff
            </Button>
          </div>
          <div className='bg-gray-950 rounded-md p-3 max-h-[600px] overflow-auto font-mono text-xs'>
            {unifiedLines.map((line, idx) => (
              <div
                key={idx}
                className={`${getLineBackgroundColor(line.type)} ${getLineTextColor(line.type)} px-2 py-0.5`}
              >
                <span className='inline-block w-12 text-gray-500 mr-2'>
                  {line.type === 'unchanged'
                    ? line.modifiedLine
                    : line.type === 'added'
                    ? `+${line.modifiedLine}`
                    : `-${line.originalLine}`}
                </span>
                {line.type === 'removed' && '-'}
                {line.type === 'added' && '+'}
                {line.type === 'unchanged' && ' '}
                <span className='ml-2'>{line.content}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <h1 className='text-xl sm:text-2xl font-bold text-white mb-2'>Format-Aware Diff</h1>
        <p className='text-xs sm:text-sm text-gray-400'>Compare two code blocks with normalized whitespace and formatting</p>
      </div>
      {/* Content */}
      <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
        <div className='max-w-7xl mx-auto space-y-6'>
          {/* Input Section */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6'>
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <label className='block text-xs sm:text-sm font-medium text-gray-300'>Original Code</label>
                <Textarea
                  placeholder='Enter original code here...'
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                  rows={12}
                  className='font-mono text-sm'
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6 space-y-4'>
                <label className='block text-sm font-medium text-gray-300'>Modified Code</label>
                <Textarea
                  placeholder='Enter modified code here...'
                  value={modified}
                  onChange={(e) => setModified(e.target.value)}
                  rows={12}
                  className='font-mono text-sm'
                />
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className='flex items-center justify-between'>
            <div className='flex gap-2'>
              <Button
                onClick={() => setViewMode('side-by-side')}
                variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                size='sm'
              >
                Side by Side
              </Button>
              <Button
                onClick={() => setViewMode('unified')}
                variant={viewMode === 'unified' ? 'default' : 'outline'}
                size='sm'
              >
                Unified
              </Button>
            </div>
            <Button onClick={handleCompare} disabled={!original.trim() || !modified.trim()} size='lg'>
              <GitCompare className='w-4 h-4 mr-2' />
              Compare
            </Button>
          </div>

          {/* Summary */}
          {summary && (
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-6 text-sm'>
                  <div className='flex items-center gap-2'>
                    <div className='w-3 h-3 bg-green-900/50 rounded'></div>
                    <span className='text-gray-400'>{summary.added} lines added</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='w-3 h-3 bg-red-900/50 rounded'></div>
                    <span className='text-gray-400'>{summary.removed} lines removed</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='w-3 h-3 bg-gray-700 rounded'></div>
                    <span className='text-gray-400'>{summary.unchanged} lines unchanged</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {diffResult && viewMode === 'side-by-side' && (
            <div className='grid lg:grid-cols-2 gap-6'>
              <Card>
                <CardContent className='pt-6'>
                  <h3 className='text-sm font-semibold text-gray-300 mb-3'>Original</h3>
                  <div className='bg-gray-950 rounded-md p-3 max-h-[600px] overflow-auto font-mono text-xs'>
                    {diffResult.originalLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`${getLineBackgroundColor(line.type)} ${getLineTextColor(line.type)} px-2 py-0.5`}
                      >
                        <span className='inline-block w-8 text-gray-500 mr-2'>{line.lineNumber || ''}</span>
                        {line.content}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className='pt-6'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-sm font-semibold text-gray-300'>Modified</h3>
                    <Button onClick={handleCopy} variant='outline' size='sm'>
                      {copied ? <Check className='w-4 h-4 mr-2' /> : <Copy className='w-4 h-4 mr-2' />}
                      Copy Diff
                    </Button>
                  </div>
                  <div className='bg-gray-950 rounded-md p-3 max-h-[600px] overflow-auto font-mono text-xs'>
                    {diffResult.modifiedLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`${getLineBackgroundColor(line.type)} ${getLineTextColor(line.type)} px-2 py-0.5`}
                      >
                        <span className='inline-block w-8 text-gray-500 mr-2'>{line.lineNumber || ''}</span>
                        {line.content}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {viewMode === 'unified' && renderUnifiedDiff()}

          {!diffResult && original && modified && (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <div className='text-center text-gray-500 py-12'>
                  <GitCompare className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Click "Compare" to see the differences</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
