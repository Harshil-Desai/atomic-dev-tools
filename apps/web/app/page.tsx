"use client"
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TOOLS } from '@/lib/tools';
import type { Tool } from '@/utils';

type Theme = 'dark' | 'light';

const CATEGORY_META: Record<string, { code: string; name: string; dataCat: string }> = {
  api:      { code: 'A', name: 'API & Network',    dataCat: 'api' },
  data:     { code: 'B', name: 'Data & Encoding',  dataCat: 'data' },
  text:     { code: 'C', name: 'Text & Code',      dataCat: 'text' },
  time:     { code: 'D', name: 'Time & IDs',       dataCat: 'time' },
  security: { code: 'E', name: 'Security',         dataCat: 'security' },
  backend:  { code: 'F', name: 'Backend & Arch.',  dataCat: 'backend' },
  infra:    { code: 'G', name: 'Systems & Infra',  dataCat: 'systems' },
  ffmpeg:   { code: 'H', name: 'FFmpeg',           dataCat: 'ffmpeg' },
  ai:       { code: 'I', name: 'AI & LLM',         dataCat: 'ai' },
};

const CATEGORY_ORDER = ['api', 'data', 'text', 'time', 'security', 'backend', 'infra', 'ffmpeg', 'ai'];

function Wordmark() {
  return (
    <div className="wordmark">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="2"   fill="currentColor" />
        <circle cx="11" cy="11" r="7"   stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="11" cy="11" r="10"  stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="0" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        <line x1="11" y1="0" x2="11" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      </svg>
      <div className="wordmark-text">
        <span>atomic</span>
        <span className="wordmark-slash">/</span>
        <span className="wordmark-faint">dev-tools</span>
      </div>
    </div>
  );
}

function LiveDemo() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [src, setSrc] = useState('Designed in the browser.\nShipped at the speed of thought.');
  const out = useMemo(() => {
    try {
      if (mode === 'encode') return btoa(unescape(encodeURIComponent(src)));
      return decodeURIComponent(escape(atob(src.replace(/\s+/g, ''))));
    } catch { return '— decode error —'; }
  }, [mode, src]);

  return (
    <div className="bp-frame demo-frame" data-cat="data">
      <span className="bp-frame-tl" /><span className="bp-frame-br" />
      <div className="bp-titleblock">
        <span className="dot" />
        <span>LIVE / BASE64 ENCODER</span>
        <span className="sep" />
        <span>category · data</span>
      </div>
      <div className="demo-tabs">
        <button className="bp-chip" data-on={mode === 'encode'} onClick={() => setMode('encode')}>encode →</button>
        <button className="bp-chip" data-on={mode === 'decode'} onClick={() => setMode('decode')}>← decode</button>
        <span className="grow" />
        <span className="bp-coord">{src.length} chars in</span>
        <span className="bp-coord">/</span>
        <span className="bp-coord">{out.length} chars out</span>
      </div>
      <div className="demo-body">
        <div className="demo-pane">
          <div className="bp-label demo-pane-label">INPUT · A</div>
          <textarea className="bp-textarea demo-ta" value={src} onChange={e => setSrc(e.target.value)} spellCheck={false} />
        </div>
        <div className="demo-arrow">
          <svg width="100%" height="100%" viewBox="0 0 40 200" preserveAspectRatio="none">
            <line x1="20" y1="0" x2="20" y2="200" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5"/>
            <circle cx="20" cy="100" r="10" fill="var(--paper)" stroke="currentColor" strokeWidth="1" />
            <path d="M 16 96 L 24 100 L 16 104" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>
        <div className="demo-pane">
          <div className="bp-label demo-pane-label">OUTPUT · B</div>
          <textarea className="bp-textarea demo-ta" value={out} readOnly spellCheck={false} />
        </div>
      </div>
      <div className="demo-foot">
        <span className="bp-status" data-state="ok">live</span>
        <span className="bp-coord">no network · 0 ms RTT</span>
        <span className="grow" />
        <button className="bp-btn" data-variant="ghost" onClick={() => navigator.clipboard?.writeText(out)}>Copy</button>
        <Link href={`/tools/base64-encoder`} className="bp-btn">Open in workspace ↗</Link>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>('dark');

  const catalogByCategory = useMemo(() => {
    return CATEGORY_ORDER
      .map(cat => {
        const meta = CATEGORY_META[cat];
        if (!meta) return null;
        const tools = TOOLS.filter(t => t.category === cat);
        if (tools.length === 0) return null;
        return { ...meta, cat, tools };
      })
      .filter(Boolean) as Array<{
        code: string; name: string; dataCat: string; cat: string;
        tools: Tool[];
      }>;
  }, []);

  const totalTools = TOOLS.length;

  const specRows: [string, string][] = [
    ['Framework',         'Next.js 14 — App Router'],
    ['Language',          'TypeScript · strict'],
    ['Styling',           'Tailwind CSS · zero runtime CSS-in-JS'],
    ['Bundle (per tool)', '< 60 kB gzipped — lazy-loaded'],
    ['Cold load',         '< 200 ms on cable broadband'],
    ['Network requests',  '0 (excl. fonts) per tool execution'],
    ['Telemetry',         'none'],
    ['Cookies',           'none (preferences via localStorage)'],
    ['Compute',           '100% client-side (1 server route for TCP ping)'],
    ['License',           'MIT'],
  ];

  return (
    <div className="bp-page" data-theme={theme}>
      <div className="landing">
        {/* Nav */}
        <div className="land-nav">
          <div className="row" style={{ gap: 16 }}>
            <Wordmark />
            <span className="bp-coord">v2.0.0 — pre-release</span>
          </div>
          <div className="row" style={{ gap: 18 }}>
            <a className="land-link" href="#tools">Tools</a>
            <a className="land-link" href="#principles">Principles</a>
            <a className="land-link" href="#spec">Spec</a>
            <a
              className="land-link"
              href="https://github.com/Harshil-Desai/atomic-dev-tools"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source
            </a>
            <button
              className="bp-btn"
              data-variant="ghost"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '◑ light' : '◐ dark'}
            </button>
            <Link href="/tools" className="bp-btn" data-variant="solid">
              Open workspace <span style={{ opacity: 0.6 }}>↵</span>
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="hero bp-paper">
          <div className="bp-ruler-x" />
          <div className="bp-ruler-y" />
          <div className="hero-grid">
            <div className="hero-left">
              <div className="bp-label">SHEET 01 / 04 — INDEX</div>
              <h1 className="bp-h1">
                Developer utilities,<br />
                <span style={{ color: 'var(--accent)' }}>drafted</span> with intent.
              </h1>
              <p className="hero-lede">
                {totalTools} single-purpose tools. No splash screens, no installs,
                no cookie walls. Type in the left pane → read the right pane.
                Keyboard-first. Browser-native.{' '}
                <span style={{ color: 'var(--ink)' }}>Atomic.</span>
              </p>
              <div className="hero-cta row">
                <Link href="/tools" className="bp-btn" data-variant="solid">
                  Open workspace
                </Link>
                <a href="#tools" className="bp-btn">Browse {totalTools} tools</a>
                <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
                  <span className="bp-coord">SHORTCUT</span>
                  <span className="bp-kbd">⌘</span>
                  <span className="bp-kbd">K</span>
                </div>
              </div>
              <div className="hero-meta">
                <div className="meta-cell">
                  <div className="bp-label">LOAD</div>
                  <div className="meta-v">&lt; 200 ms</div>
                </div>
                <div className="meta-cell">
                  <div className="bp-label">DEPS</div>
                  <div className="meta-v">0 (client-side)</div>
                </div>
                <div className="meta-cell">
                  <div className="bp-label">TRACKING</div>
                  <div className="meta-v">none</div>
                </div>
                <div className="meta-cell">
                  <div className="bp-label">LICENSE</div>
                  <div className="meta-v">MIT</div>
                </div>
              </div>
            </div>
            <div className="hero-right">
              <LiveDemo />
            </div>
          </div>
          <div className="hero-baseline">
            <span>A — atomicdevtools.com</span>
            <span className="grow" />
            <span>DRAWING NO. 0001</span>
            <span>·</span>
            <span>REV. 03</span>
            <span>·</span>
            <span>SCALE 1:1</span>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="principles bp-paper dense">
          <div className="section-head">
            <span className="bp-label">§ 02 — PRINCIPLES</span>
            <h2 className="bp-h2">Four constraints. No exceptions.</h2>
          </div>
          <div className="principles-grid">
            {[
              { n: '01', t: 'Instant',  d: 'Each tool is a single client-side route. First paint under 200 ms. No skeletons, no shimmer.' },
              { n: '02', t: 'Atomic',   d: 'One screen, one task, one canonical input. No tabs, no wizards, no upsells in the middle.' },
              { n: '03', t: 'Local',    d: 'Compute runs in your browser. Your data never leaves the tab. Works offline once loaded.' },
              { n: '04', t: 'Keyboard', d: '⌘K opens anything. Every primary action has a shortcut. Mouse is welcome but not required.' },
            ].map(p => (
              <div key={p.n} className="bp-frame principle">
                <span className="bp-frame-tl" /><span className="bp-frame-br" />
                <div className="principle-n">{p.n}</div>
                <div className="principle-t">{p.t}</div>
                <hr className="bp-rule" />
                <div className="principle-d">{p.d}</div>
                <div className="principle-foot">
                  <span className="bp-coord">[ verified · always-on ]</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Catalog */}
        <section id="tools" className="catalog">
          <div className="section-head">
            <span className="bp-label">§ 03 — CATALOG</span>
            <h2 className="bp-h2">{totalTools} tools, {catalogByCategory.length} categories.</h2>
          </div>
          <div className="catalog-list">
            {catalogByCategory.map(cat => (
              <div key={cat.cat} className="cat-row" data-cat={cat.dataCat}>
                <div className="cat-head">
                  <span className="dot" />
                  <span className="cat-id">{cat.code}</span>
                  <span className="cat-name">{cat.name}</span>
                  <span className="grow" />
                  <span className="bp-coord">{cat.tools.length} tools</span>
                </div>
                <div className="cat-tools">
                  {cat.tools.map(t => (
                    <Link key={t.id} href={t.path} className="cat-tool">
                      <span className="cat-tool-name">{t.name}</span>
                      <span className="cat-tool-d">{t.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spec */}
        <section id="spec" className="spec">
          <div className="section-head">
            <span className="bp-label">§ 04 — SPEC SHEET</span>
            <h2 className="bp-h2">Constraints, in writing.</h2>
          </div>
          <div className="bp-frame spec-frame">
            <span className="bp-frame-tl" /><span className="bp-frame-br" />
            <div className="bp-titleblock">
              <span className="dot" />
              <span>TECHNICAL SPECIFICATION · DOC-ADT-0001</span>
              <span className="sep" />
              <span>page 1 of 1</span>
            </div>
            <table className="spec-table">
              <tbody>
                {specRows.map((r, i) => (
                  <tr key={i}>
                    <td className="spec-k">{String(i + 1).padStart(2, '0')}</td>
                    <td className="spec-l">{r[0]}</td>
                    <td className="spec-v">{r[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="land-foot">
          <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <Wordmark />
          </div>
          <div className="foot-cols">
            {[
              { head: 'PRODUCT',   links: [{ l: 'Workspace', h: '/tools' }, { l: 'Changelog', h: '#' }, { l: 'Roadmap', h: '#' }] },
              { head: 'RESOURCES', links: [{ l: 'Source', h: 'https://github.com/Harshil-Desai/atomic-dev-tools' }, { l: 'Documentation', h: '#' }, { l: 'License', h: '#' }] },
              { head: 'CONTACT',   links: [{ l: 'GitHub', h: 'https://github.com/Harshil-Desai/atomic-dev-tools' }, { l: 'Issues', h: 'https://github.com/Harshil-Desai/atomic-dev-tools/issues' }] },
            ].map(col => (
              <div key={col.head} className="foot-col">
                <div className="bp-label">{col.head}</div>
                {col.links.map(({ l, h }) => (
                  <a key={l} className="land-link" href={h} target={h.startsWith('http') ? '_blank' : undefined} rel={h.startsWith('http') ? 'noopener noreferrer' : undefined}>{l}</a>
                ))}
              </div>
            ))}
          </div>
          <div className="foot-base">
            <span>© 2026 · made for developers, by developers</span>
            <span className="grow" />
            <span className="bp-coord">END SHEET 04 / 04</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
