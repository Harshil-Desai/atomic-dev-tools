'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileText, Copy, Check, Eye, Code } from 'lucide-react';
import { Button } from '@/ui';
import { Card, CardContent } from '@/ui';
import { Textarea } from '@/ui';

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
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(md: string): string {
  // Protect code blocks first
  const codeBlocks: string[] = [];
  let html = md.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang.trim() ? ` class="language-${lang.trim()}"` : '';
    const escaped = escapeHtml(code.replace(/\n$/, ''));
    codeBlocks.push(`<pre><code${langClass}>${escaped}</code></pre>`);
    return `\x00CODE${codeBlocks.length - 1}\x00`;
  });

  // Protect inline code
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `\x00INLINE${inlineCodes.length - 1}\x00`;
  });

  // Horizontal rule (must come before heading detection)
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>');

  // ATX headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes — collect consecutive > lines
  html = html.replace(/^((?:> ?[^\n]*\n?)+)/gm, (match) => {
    const inner = match.replace(/^> ?/gm, '').trim();
    return `<blockquote>${inner}</blockquote>\n`;
  });

  // Process unordered lists
  html = html.replace(/((?:^[ \t]*[-*+] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line => {
      const content = line.replace(/^[ \t]*[-*+] /, '');
      return `<li>${content}</li>`;
    });
    return `<ul>${items.join('')}</ul>\n`;
  });

  // Process ordered lists
  html = html.replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line => {
      const content = line.replace(/^[ \t]*\d+\. /, '');
      return `<li>${content}</li>`;
    });
    return `<ol>${items.join('')}</ol>\n`;
  });

  // Images (must come before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold (** or __)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (* or _) — careful not to catch **)
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Paragraphs: split on blank lines, wrap non-block-elements
  const blockTags = /^<(?:h[1-6]|ul|ol|li|blockquote|pre|hr|p|div|img)/i;
  const paragraphs = html.split(/\n{2,}/);
  html = paragraphs.map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    if (blockTags.test(trimmed)) return trimmed;
    if (trimmed.startsWith('\x00CODE')) return trimmed;
    // Convert single newlines within paragraph to <br>
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  // Restore inline codes
  inlineCodes.forEach((code, i) => {
    html = html.replace(`\x00INLINE${i}\x00`, code);
  });

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`\x00CODE${i}\x00`, block);
  });

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
  .md-preview code { background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 0.1em 0.4em; font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace; font-size: 0.875em; color: #f97316; }
  .md-preview pre { background: #0d0d0d; border: 1px solid #2a2a2a; border-radius: 8px; padding: 1rem 1.2rem; overflow-x: auto; margin: 1em 0; }
  .md-preview pre code { background: none; border: none; padding: 0; color: #e2e8f0; font-size: 0.85em; }
  .md-preview blockquote { border-left: 4px solid #4ade80; background: #1a2a1a; margin: 1em 0; padding: 0.5em 1em; border-radius: 0 6px 6px 0; color: #a3e635; }
  .md-preview ul, .md-preview ol { padding-left: 1.6em; margin: 0.5em 0; }
  .md-preview li { margin: 0.2em 0; }
  .md-preview ul li { list-style-type: disc; }
  .md-preview ol li { list-style-type: decimal; }
  .md-preview hr { border: none; border-top: 1px solid #333; margin: 1.5em 0; }
  .md-preview img { max-width: 100%; border-radius: 6px; margin: 0.5em 0; }
  .md-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .md-preview th, .md-preview td { border: 1px solid #333; padding: 0.5em 0.8em; }
  .md-preview th { background: #1e1e1e; font-weight: 600; }
`;

export default function MarkdownPreviewPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split');

  const renderedHtml = useMemo(() => markdownToHtml(markdown), [markdown]);

  const charCount = markdown.length;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  const copyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch { /* ignore */ }
  }, [renderedHtml]);

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch { /* ignore */ }
  }, [markdown]);

  const showEditor = view === 'split' || view === 'editor';
  const showPreview = view === 'split' || view === 'preview';

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Markdown Previewer</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Write Markdown, see the rendered HTML preview instantly</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md border border-[hsla(0,0%,20%,1)] overflow-hidden">
              {(['split', 'editor', 'preview'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                >
                  {v === 'editor' ? <><Code className="w-3 h-3 inline mr-1" />Editor</> : v === 'preview' ? <><Eye className="w-3 h-3 inline mr-1" />Preview</> : 'Split'}
                </button>
              ))}
            </div>
            <Button onClick={copyMarkdown} variant="outline" size="sm">
              {copiedMd ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy MD</>}
            </Button>
            <Button onClick={copyHtml} variant="outline" size="sm">
              {copiedHtml ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy HTML</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 sm:p-5 md:p-6">
        <div className={`h-full flex gap-4 ${view === 'split' ? 'flex-col md:flex-row' : 'flex-col'}`}>

          {/* Editor */}
          {showEditor && (
            <div className={`flex flex-col ${view === 'split' ? 'flex-1 min-h-0' : 'flex-1'}`}>
              <Card className="flex-1 flex flex-col min-h-0">
                <CardContent className="pt-4 flex flex-col flex-1 min-h-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Markdown</label>
                    <span className="text-xs text-gray-600">{charCount} chars · {wordCount} words</span>
                  </div>
                  <textarea
                    value={markdown}
                    onChange={e => setMarkdown(e.target.value)}
                    className="flex-1 w-full bg-[#0d0d0d] border border-[hsla(0,0%,20%,1)] rounded-md p-3 font-mono text-sm text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[300px]"
                    spellCheck={false}
                    placeholder="Write your markdown here..."
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preview */}
          {showPreview && (
            <div className={`flex flex-col ${view === 'split' ? 'flex-1 min-h-0' : 'flex-1'}`}>
              <Card className="flex-1 flex flex-col min-h-0">
                <CardContent className="pt-4 flex flex-col flex-1 min-h-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preview</label>
                    <span className="text-xs text-gray-600">HTML output</span>
                  </div>
                  <div className="flex-1 overflow-auto rounded-md min-h-[300px]">
                    <style dangerouslySetInnerHTML={{ __html: PREVIEW_STYLES }} />
                    <div
                      className="md-preview"
                      dangerouslySetInnerHTML={{ __html: renderedHtml || '<p style="color:#555;font-style:italic">Nothing to preview yet...</p>' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
