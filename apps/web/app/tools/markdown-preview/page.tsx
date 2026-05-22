'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileText, Eye, Code } from 'lucide-react';
import { BpToolStage, BpPanel, BpCopyBtn } from '@/components/blueprint';

const DEFAULT_MARKDOWN = `# Welcome to Markdown Previewer

A **live** markdown editor and previewer with _dark theme_ support.

## Features

- Real-time preview
- Syntax highlighting for code blocks
- Full CommonMark-compatible rendering

## Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

## Blockquote

> "Any sufficiently advanced technology is indistinguishable from magic."
> — Arthur C. Clarke

## Table-like list

- **Bold text** for emphasis
- *Italic text* for style
- ~~Strikethrough~~ for deletions
- \`inline code\` for code snippets

## Links & Images

Visit [GitHub](https://github.com) for open-source projects.

## Ordered List

1. Install dependencies
2. Configure settings
3. Run the application
4. Enjoy the results

---

*Happy writing!*
`;

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function applyInline(text: string, inlineCodes: string[]): string {
  let s = text;
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  inlineCodes.forEach((code, i) => { s = s.replace(`\x00INLINE${i}\x00`, code); });
  return s;
}

function markdownToHtml(md: string): string {
  const codeBlocks: string[] = [];
  let html = md.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang.trim() ? ` class="language-${lang.trim()}"` : '';
    const escaped = escapeHtml(code.replace(/\n$/, ''));
    codeBlocks.push(`<pre><code${langClass}>${escaped}</code></pre>`);
    return `\x00CODE${codeBlocks.length - 1}\x00`;
  });
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `\x00INLINE${inlineCodes.length - 1}\x00`;
  });
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>');
  html = html.replace(/^###### (.+)$/gm, (_m, c) => `<h6>${applyInline(c, inlineCodes)}</h6>`);
  html = html.replace(/^##### (.+)$/gm, (_m, c) => `<h5>${applyInline(c, inlineCodes)}</h5>`);
  html = html.replace(/^#### (.+)$/gm, (_m, c) => `<h4>${applyInline(c, inlineCodes)}</h4>`);
  html = html.replace(/^### (.+)$/gm, (_m, c) => `<h3>${applyInline(c, inlineCodes)}</h3>`);
  html = html.replace(/^## (.+)$/gm, (_m, c) => `<h2>${applyInline(c, inlineCodes)}</h2>`);
  html = html.replace(/^# (.+)$/gm, (_m, c) => `<h1>${applyInline(c, inlineCodes)}</h1>`);
  html = html.replace(/^((?:> ?[^\n]*\n?)+)/gm, (match) => {
    const inner = match.replace(/^> ?/gm, '').trim().split('\n').map(line => applyInline(line, inlineCodes)).join('\n');
    return `<blockquote>${inner}</blockquote>\n`;
  });
  html = html.replace(/((?:^[ \t]*[-*+] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line => `<li>${applyInline(line.replace(/^[ \t]*[-*+] /, ''), inlineCodes)}</li>`);
    return `<ul>${items.join('')}</ul>\n`;
  });
  html = html.replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line => `<li>${applyInline(line.replace(/^[ \t]*\d+\. /, ''), inlineCodes)}</li>`);
    return `<ol>${items.join('')}</ol>\n`;
  });
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  const blockTags = /^<(?:h[1-6]|ul|ol|li|blockquote|pre|hr|p|div|img)/i;
  html = html.split(/\n{2,}/).map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    if (blockTags.test(trimmed)) return trimmed;
    if (trimmed.startsWith('\x00CODE')) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  inlineCodes.forEach((code, i) => { html = html.replace(`\x00INLINE${i}\x00`, code); });
  codeBlocks.forEach((block, i) => { html = html.replace(`\x00CODE${i}\x00`, block); });
  return html;
}

const PREVIEW_STYLES = `
  .md-preview { color: #f2f2f2; background: #121212; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.7; padding: 1.5rem; }
  .md-preview h1 { font-size: 2em; font-weight: 700; margin: 1.2em 0 0.5em; border-bottom: 1px solid #333; padding-bottom: 0.3em; color: #fff; }
  .md-preview h2 { font-size: 1.5em; font-weight: 600; margin: 1.2em 0 0.5em; border-bottom: 1px solid #2a2a2a; padding-bottom: 0.2em; color: #f0f0f0; }
  .md-preview h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.4em; color: #e8e8e8; }
  .md-preview h4 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.3em; color: #e0e0e0; }
  .md-preview h5 { font-size: 1em; font-weight: 600; margin: 0.8em 0 0.3em; color: #d8d8d8; }
  .md-preview h6 { font-size: 0.9em; font-weight: 600; margin: 0.8em 0 0.3em; color: #aaa; }
  .md-preview p { margin: 0.6em 0; }
  .md-preview strong { color: #fff; font-weight: 600; }
  .md-preview em { font-style: italic; color: #d4d4d4; }
  .md-preview del { color: #888; text-decoration: line-through; }
  .md-preview a { color: #60a5fa; text-decoration: underline; }
  .md-preview a:hover { color: #93c5fd; }
  .md-preview code { background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 0.1em 0.4em; font-family: 'Fira Code', Consolas, monospace; font-size: 0.875em; color: #f97316; }
  .md-preview pre { background: #0d0d0d; border: 1px solid #2a2a2a; border-radius: 8px; padding: 1rem 1.2rem; overflow-x: auto; margin: 1em 0; }
  .md-preview pre code { background: none; border: none; padding: 0; color: #e2e8f0; font-size: 0.85em; }
  .md-preview blockquote { border-left: 4px solid #4ade80; background: #1a2a1a; margin: 1em 0; padding: 0.5em 1em; border-radius: 0 6px 6px 0; color: #a3e635; }
  .md-preview ul, .md-preview ol { padding-left: 1.6em; margin: 0.5em 0; }
  .md-preview li { margin: 0.2em 0; }
  .md-preview ul li { list-style-type: disc; }
  .md-preview ol li { list-style-type: decimal; }
  .md-preview hr { border: none; border-top: 1px solid #333; margin: 1.5em 0; }
  .md-preview img { max-width: 100%; border-radius: 6px; margin: 0.5em 0; }
`;

export default function MarkdownPreviewPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split');

  const renderedHtml = useMemo(() => markdownToHtml(markdown), [markdown]);
  const charCount = markdown.length;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  const showEditor = view === 'split' || view === 'editor';
  const showPreview = view === 'split' || view === 'preview';

  return (
    <BpToolStage cat='text'>
      <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-white mb-1'>Markdown Previewer</h1>
            <p className='text-xs sm:text-sm text-gray-400'>Write Markdown, see the rendered HTML preview instantly</p>
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <div className='flex rounded border border-[hsla(0,0%,20%,1)] overflow-hidden'>
              {(['split', 'editor', 'preview'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} type='button'
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
                  {v === 'editor' ? <><Code className='w-3 h-3 inline mr-1' />Editor</> : v === 'preview' ? <><Eye className='w-3 h-3 inline mr-1' />Preview</> : 'Split'}
                </button>
              ))}
            </div>
            <BpCopyBtn text={markdown} label='COPY MD' />
            <BpCopyBtn text={renderedHtml} label='COPY HTML' />
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-hidden p-4 sm:p-5 md:p-6'>
        <div className={`h-full flex gap-4 ${view === 'split' ? 'flex-col md:flex-row' : 'flex-col'}`}>
          {showEditor && (
            <div className={`flex flex-col ${view === 'split' ? 'flex-1 min-h-0' : 'flex-1'}`}>
              <BpPanel title='Markdown' meta={`${charCount} chars · ${wordCount} words`} className='flex-1 flex flex-col min-h-0'>
                <textarea
                  value={markdown}
                  onChange={e => setMarkdown(e.target.value)}
                  className='bp-textarea font-mono text-sm flex-1 min-h-[300px]'
                  spellCheck={false}
                  placeholder='Write your markdown here...'
                />
              </BpPanel>
            </div>
          )}
          {showPreview && (
            <div className={`flex flex-col ${view === 'split' ? 'flex-1 min-h-0' : 'flex-1'}`}>
              <BpPanel title='Preview' meta='HTML output' className='flex-1 flex flex-col min-h-0'>
                <div className='flex-1 overflow-auto rounded min-h-[300px]'>
                  <style dangerouslySetInnerHTML={{ __html: PREVIEW_STYLES }} />
                  <div className='md-preview' dangerouslySetInnerHTML={{ __html: renderedHtml || '<p style="color:#555;font-style:italic">Nothing to preview yet...</p>' }} />
                </div>
              </BpPanel>
            </div>
          )}
        </div>
      </div>
    </BpToolStage>
  );
}
