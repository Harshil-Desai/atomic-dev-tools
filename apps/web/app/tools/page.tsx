"use client"
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TOOLS } from '@/lib/tools';

type CatMeta = { code: string; name: string; dataCat: string };

const CATEGORY_META: Record<string, CatMeta> = {
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

/* Minimal SVG schematic thumbnails keyed by tool id */
function ToolThumb({ id, accent }: { id: string; accent: string }) {
  const M = 'var(--ink-faint)';
  const A = accent;
  const C = 'currentColor';

  const diagrams: Record<string, React.ReactNode> = {
    'api-tester':              <><rect x="6" y="14" width="120" height="10" stroke={M} fill="none"/><rect x="6" y="30" width="80" height="6" fill={A}/><rect x="6" y="42" width="60" height="4" fill={M}/><rect x="6" y="50" width="100" height="4" fill={M}/></>,
    'jwt-inspector':           <><rect x="6" y="14" width="36" height="42" fill={A} opacity="0.4"/><rect x="46" y="14" width="36" height="42" fill={A} opacity="0.7"/><rect x="86" y="14" width="36" height="42" fill={A} opacity="0.2"/><text x="8" y="62" fontSize="7" fill={M}>HEAD·PAYLOAD·SIG</text></>,
    'url-parser':              <><line x1="6" y1="20" x2="126" y2="20" stroke={A}/><circle cx="20" cy="20" r="3" fill={C}/><circle cx="55" cy="20" r="3" fill={C}/><circle cx="90" cy="20" r="3" fill={C}/><text x="6" y="40" fontSize="7" fill={M}>scheme :// host / path ? q</text></>,
    'curl-converter':          <><text x="6" y="22" fontSize="9" fill={A}>curl -X</text><path d="M 55 26 L 65 30 L 55 34" stroke={M} fill="none"/><text x="70" y="32" fontSize="9" fill={C}>fetch()</text></>,
    'cors-checker':            <><circle cx="32" cy="32" r="14" stroke={A} fill="none"/><circle cx="100" cy="32" r="14" stroke={M} fill="none"/><path d="M 46 32 L 86 32" stroke={C} strokeDasharray="2 2"/><text x="48" y="28" fontSize="7" fill={M}>OPTIONS</text></>,
    'base64-encoder':          <><rect x="6"  y="14" width="55" height="42" stroke={M} fill="none"/><rect x="69" y="14" width="55" height="42" stroke={A} fill="none"/><path d="M 61 35 L 69 35" stroke={C}/><text x="9" y="29" fontSize="7" fill={M}>text</text><text x="72" y="29" fontSize="7" fill={A}>b64</text></>,
    'json-formatter':          <><rect x="6" y="12" width="6" height="44" fill={A}/><text x="18" y="22" fontSize="8" fill={C}>{'{'}</text><text x="26" y="32" fontSize="7" fill={M}>"key":</text><text x="60" y="32" fontSize="7" fill={A}>"value"</text><text x="18" y="48" fontSize="8" fill={C}>{'}'}</text></>,
    'json-yaml-converter':     <><text x="8" y="24" fontSize="7" fill={M}>{'{ "a": 1 }'}</text><path d="M 8 34 L 124 34" stroke={C} strokeDasharray="2 2"/><text x="8" y="48" fontSize="7" fill={A}>a: 1</text></>,
    'csv-json-converter':      <><text x="8" y="22" fontSize="7" fill={M}>a,b,c</text><text x="8" y="34" fontSize="7" fill={M}>1,2,3</text><path d="M 50 28 L 60 28" stroke={C}/><text x="65" y="22" fontSize="7" fill={A}>[{'{'}</text><text x="65" y="34" fontSize="7" fill={A}>"a":1{'}'}]</text></>,
    'number-base-converter':   <><text x="8" y="22" fontSize="8" fill={A}>255</text><text x="8" y="36" fontSize="8" fill={M}>FF</text><text x="50" y="22" fontSize="8" fill={M}>11111111</text><text x="50" y="36" fontSize="8" fill={M}>377</text></>,
    'hash-generator':          <><rect x="6" y="18" width="120" height="6" fill={A}/><rect x="6" y="28" width="120" height="6" fill={A} opacity="0.6"/><rect x="6" y="38" width="120" height="6" fill={A} opacity="0.4"/><rect x="6" y="48" width="120" height="6" fill={A} opacity="0.25"/></>,
    'format-aware-diff':       <><rect x="6" y="14" width="55" height="6" fill={M}/><rect x="6" y="24" width="55" height="6" fill={A} opacity="0.5"/><rect x="6" y="34" width="55" height="6" fill={M}/><rect x="69" y="14" width="55" height="6" fill={M}/><rect x="69" y="24" width="55" height="6" fill={A}/><rect x="69" y="34" width="55" height="6" fill={M}/></>,
    'text-escape':             <><text x="8" y="22" fontSize="8" fill={M}>&lt;p&gt;</text><path d="M 36 18 L 50 18" stroke={C}/><text x="55" y="22" fontSize="8" fill={A}>&amp;lt;p&amp;gt;</text></>,
    'code-formatter':          <><rect x="6" y="14" width="40" height="3" fill={M}/><rect x="6" y="20" width="60" height="3" fill={M}/><rect x="14" y="26" width="50" height="3" fill={A}/><rect x="14" y="32" width="45" height="3" fill={A}/><rect x="6" y="38" width="55" height="3" fill={M}/></>,
    'case-converter':          <><text x="8" y="22" fontSize="8" fill={M}>myVar</text><text x="8" y="34" fontSize="8" fill={A}>my_var</text><text x="60" y="22" fontSize="8" fill={M}>MyVar</text><text x="60" y="34" fontSize="8" fill={A}>my-var</text></>,
    'regex-tester':            <><text x="8" y="22" fontSize="8" fill={A}>/(\w+)/g</text><rect x="8" y="30" width="20" height="10" fill={A} opacity="0.4"/><text x="32" y="38" fontSize="7" fill={M}>match</text></>,
    'markdown-preview':        <><text x="8" y="22" fontSize="8" fill={M}># Hi</text><path d="M 50 26 L 60 26" stroke={C}/><rect x="65" y="14" width="60" height="14" fill={A} opacity="0.5"/></>,
    'lorem-ipsum':             <><rect x="6" y="14" width="100" height="3" fill={M}/><rect x="6" y="22" width="120" height="3" fill={M}/><rect x="6" y="30" width="80" height="3" fill={M}/><rect x="6" y="38" width="110" height="3" fill={A}/></>,
    'svg-to-jsx':              <><text x="8" y="22" fontSize="7" fill={M}>{'<svg>'}</text><path d="M 40 18 L 54 18" stroke={C}/><text x="58" y="22" fontSize="7" fill={A}>{'<Svg />'}</text></>,
    'css-clamp-generator':     <><text x="8" y="22" fontSize="7" fill={A}>clamp(</text><text x="8" y="34" fontSize="7" fill={M}>1rem, 2vw,</text><text x="8" y="46" fontSize="7" fill={A}>3rem)</text></>,
    'epoch-converter':         <><text x="8" y="24" fontSize="9" fill={A}>1704067200</text><path d="M 8 32 L 124 32" stroke={C} strokeDasharray="2 2"/><text x="8" y="46" fontSize="8" fill={M}>2024-01-01 00:00 UTC</text></>,
    'uuid-generator':          <><rect x="6" y="14" width="120" height="3" fill={A}/><rect x="6" y="20" width="120" height="3" fill={A} opacity="0.7"/><rect x="6" y="26" width="120" height="3" fill={A} opacity="0.5"/><rect x="6" y="32" width="120" height="3" fill={A} opacity="0.35"/></>,
    'cron-parser':             <><text x="8" y="24" fontSize="10" fill={A}>* * * * *</text><text x="8" y="42" fontSize="7" fill={M}>every minute</text></>,
    'timezone-converter':      <><circle cx="40" cy="32" r="14" stroke={A} fill="none"/><line x1="40" y1="32" x2="40" y2="22" stroke={C}/><circle cx="95" cy="32" r="14" stroke={M} fill="none"/><line x1="95" y1="32" x2="100" y2="26" stroke={C}/></>,
    'password-generator':      <><text x="8" y="24" fontSize="9" fill={A}>aB3$xK7!</text><rect x="8" y="32" width="20" height="4" fill={A}/><rect x="32" y="32" width="20" height="4" fill={A}/><rect x="56" y="32" width="20" height="4" fill={A}/><rect x="80" y="32" width="20" height="4" fill={M}/></>,
    'hmac-generator':          <><rect x="6" y="14" width="40" height="14" stroke={M} fill="none"/><rect x="50" y="14" width="20" height="14" fill={A}/><rect x="74" y="14" width="55" height="14" stroke={A} fill="none"/><text x="6" y="40" fontSize="7" fill={M}>msg + key → tag</text></>,
    'jwt-generator':           <><rect x="6" y="14" width="40" height="42" fill={A} opacity="0.5"/><text x="50" y="32" fontSize="9" fill={C}>sign →</text><rect x="86" y="14" width="42" height="42" fill={A}/></>,
    'bcrypt-generator':        <><text x="8" y="22" fontSize="7" fill={A}>$2b$10$...</text><rect x="8" y="30" width="80" height="4" fill={A} opacity="0.4"/><text x="8" y="46" fontSize="7" fill={M}>verify hash</text></>,
    'json-to-type':            <><text x="8" y="22" fontSize="7" fill={M}>{'{ "n": 1 }'}</text><path d="M 8 30 L 124 30" stroke={C} strokeDasharray="2 2"/><text x="8" y="44" fontSize="7" fill={A}>interface T {'{'}</text><text x="8" y="54" fontSize="7" fill={A}>{'  n: number }'}</text></>,
    'snowflake-decoder':       <><rect x="6"  y="22" width="30" height="14" fill={A}/><rect x="38" y="22" width="14" height="14" fill={A} opacity="0.7"/><rect x="54" y="22" width="14" height="14" fill={A} opacity="0.5"/><rect x="70" y="22" width="50" height="14" fill={A} opacity="0.3"/></>,
    'sql-formatter':           <><text x="8" y="22" fontSize="8" fill={A}>SELECT</text><text x="8" y="34" fontSize="7" fill={M}>  id, name</text><text x="8" y="46" fontSize="8" fill={A}>FROM</text><text x="40" y="46" fontSize="7" fill={M}>users</text></>,
    'port-checker':            <><circle cx="32" cy="32" r="10" stroke={A} fill="none"/><path d="M 42 32 L 90 32" stroke={C} strokeDasharray="2 2"/><circle cx="100" cy="32" r="10" stroke={M} fill="none"/><text x="50" y="48" fontSize="7" fill={M}>:443 OPEN</text></>,
    'systemd-timer-generator': <><text x="8" y="22" fontSize="8" fill={M}>* * * * *</text><path d="M 8 30 L 124 30" stroke={C} strokeDasharray="2 2"/><text x="8" y="44" fontSize="7" fill={A}>OnCalendar=...</text></>,
    'bitwise-calculator':      <>{[0,14,28,42,56,70,84,98].map((x,i)=><rect key={i} x={x+6} y="20" width="12" height="12" fill={i%2===0?A:M}/>)}</>,
    'cidr-calculator':         <><rect x="6" y="20" width="60" height="14" fill={A}/><rect x="66" y="20" width="60" height="14" fill={A} opacity="0.3"/><text x="6" y="48" fontSize="7" fill={M}>/24 · 256 hosts</text></>,
    'chmod-calculator':        <><text x="8" y="22" fontSize="10" fill={A}>755</text><text x="42" y="22" fontSize="8" fill={M}>rwxr-xr-x</text><rect x="8" y="30" width="14" height="14" stroke={A} fill="none"/><rect x="26" y="30" width="14" height="14" stroke={M} fill="none"/><rect x="44" y="30" width="14" height="14" stroke={M} fill="none"/></>,
    'ffmpeg-clipper':          <><rect x="6" y="20" width="120" height="14" stroke={M} fill="none"/><rect x="30" y="20" width="60" height="14" fill={A} opacity="0.5"/><text x="6" y="46" fontSize="7" fill={M}>00:00 ── 00:42</text></>,
    'ffmpeg-subtitle-watermark':<><rect x="6" y="14" width="120" height="32" stroke={M} fill="none"/><rect x="14" y="36" width="70" height="6" fill={A}/><text x="6" y="56" fontSize="7" fill={M}>burn subtitle</text></>,
    'ffmpeg-audio-extractor':  <><path d="M 6 32 L 14 20 L 22 40 L 30 24 L 38 36 L 46 22 L 54 38 L 62 26 L 70 34 L 78 24 L 86 36 L 94 28 L 102 32 L 110 24 L 118 36 L 126 30" stroke={A} fill="none"/></>,
    'ffmpeg-video-resize':     <><rect x="20" y="16" width="90" height="40" stroke={A} fill="none"/><rect x="36" y="24" width="58" height="26" stroke={M} fill="none" strokeDasharray="2 2"/></>,
    'ffmpeg-thumbnail':        <>{[0,32,64,96].map((x,i)=><rect key={i} x={x+6} y="20" width={i<3?26:22} height="20" fill={A} opacity={0.6-i*0.15}/>)}</>,
    'url-regex-matcher':       <><text x="8" y="22" fontSize="7" fill={A}>https://...</text><rect x="8" y="28" width="80" height="4" fill={A} opacity="0.4"/><text x="8" y="46" fontSize="7" fill={M}>extract matches</text></>,
    'color-converter':         <><rect x="6" y="16" width="20" height="32" fill="#ff7a85"/><rect x="30" y="16" width="20" height="32" fill="#4ad29a"/><rect x="54" y="16" width="20" height="32" fill="#5fb0ff"/><rect x="78" y="16" width="20" height="32" fill="#f0c674"/></>,
    'llm-token-counter':       <><rect x="6" y="14" width="120" height="5" fill={M}/><rect x="6" y="22" width="90" height="5" fill={A} opacity="0.7"/><rect x="6" y="30" width="110" height="5" fill={A}/><text x="6" y="50" fontSize="7" fill={M}>1,024 tokens</text></>,
  };

  const D = diagrams[id] ?? <text x="8" y="36" fontSize="9" fill={M}>—</text>;
  return (
    <div className="thumb-wrap" style={{ color: 'var(--ink-mute)' }}>
      <svg viewBox="0 0 132 64" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id={`gp-${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="var(--line)" strokeWidth="0.4" opacity="0.6"/>
          </pattern>
        </defs>
        <rect width="132" height="64" fill={`url(#gp-${id})`} />
        {D}
      </svg>
    </div>
  );
}

export default function ToolsGridPage() {
  const [q, setQ] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  const categories = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return CATEGORY_ORDER
      .map(cat => {
        const meta = CATEGORY_META[cat];
        if (!meta) return null;
        const tools = TOOLS.filter(t => {
          if (t.category !== cat) return false;
          if (!ql) return true;
          return t.name.toLowerCase().includes(ql) || t.description.toLowerCase().includes(ql);
        });
        if (tools.length === 0) return null;
        if (activeCat !== 'all' && activeCat !== cat) return null;
        return { ...meta, cat, tools };
      })
      .filter(Boolean) as Array<{ code: string; name: string; dataCat: string; cat: string; tools: typeof TOOLS }>;
  }, [q, activeCat]);

  const allCategories = useMemo(() =>
    CATEGORY_ORDER
      .map(cat => {
        const meta = CATEGORY_META[cat];
        if (!meta) return null;
        const count = TOOLS.filter(t => t.category === cat).length;
        if (count === 0) return null;
        return { ...meta, cat, count };
      })
      .filter(Boolean) as Array<{ code: string; name: string; dataCat: string; cat: string; count: number }>,
  []);

  const total = categories.reduce((n, c) => n + c.tools.length, 0);

  return (
    <div className="bp-page" data-theme="dark">
      <div className="grid-launcher bp-paper">
        <div className="bp-ruler-x" />
        <div className="bp-ruler-y" />

        {/* Header */}
        <div className="grid-head">
          <Link href="/" className="back-btn">
            <span style={{ fontSize: 14 }}>←</span> home
          </Link>
          <div className="grid-title">
            <span className="bp-label">WORKSPACE / GRID LAUNCHER</span>
            <h2 className="bp-h2">Select a tool</h2>
          </div>
          <div className="grid-search">
            <span className="bp-coord">SEARCH</span>
            <input
              className="grid-search-i"
              placeholder={`filter ${TOOLS.length} tools…`}
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
            />
            <span className="bp-kbd">⌘</span>
            <span className="bp-kbd">K</span>
          </div>
          <div className="grid-count">
            <span className="mono-num">{String(total).padStart(2, '0')}</span>
            <span className="bp-coord">/ {TOOLS.length} shown</span>
          </div>
        </div>

        {/* Category filter chips */}
        <div className="cat-bar">
          <button
            className="bp-chip"
            data-on={activeCat === 'all'}
            onClick={() => setActiveCat('all')}
          >
            ALL · {TOOLS.length}
          </button>
          {allCategories.map(c => (
            <button
              key={c.cat}
              className="bp-chip cat-chip"
              data-cat={c.dataCat}
              data-on={activeCat === c.cat}
              onClick={() => setActiveCat(activeCat === c.cat ? 'all' : c.cat)}
            >
              <span className="cat-chip-dot" />
              {c.code} · {c.name} <span className="cat-chip-n">{c.count}</span>
            </button>
          ))}
        </div>

        {/* Tool sections */}
        {categories.length === 0 ? (
          <div className="grid-empty">
            <div className="bp-label">no matches</div>
            <div>Nothing in the catalog matches &ldquo;{q}&rdquo;.</div>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat.cat} className="grid-section" data-cat={cat.dataCat}>
              <div className="grid-sec-head">
                <span className="dot" />
                <span className="grid-sec-code">{cat.code}</span>
                <span className="grid-sec-name">{cat.name.toUpperCase()}</span>
                <span className="grow" />
                <span className="bp-coord">{cat.tools.length} of {TOOLS.filter(t => t.category === cat.cat).length}</span>
              </div>
              <div className="grid-cards">
                {cat.tools.map((t, i) => (
                  <Link
                    key={t.id}
                    href={t.path}
                    className="bp-frame grid-card"
                    data-cat={cat.dataCat}
                  >
                    <span className="bp-frame-tl" /><span className="bp-frame-br" />
                    <div className="card-coord">
                      <span>{cat.code}{String(i + 1).padStart(2, '0')}</span>
                      <span className="dot" />
                    </div>
                    <ToolThumb id={t.id} accent="var(--accent)" />
                    <div className="card-meta">
                      <div className="card-name">{t.name}</div>
                      <div className="card-d">{t.description}</div>
                    </div>
                    <div className="card-foot">
                      <span className="bp-coord">open ↗</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="grid-foot">
          <span>SHEET 02 / 04 — WORKSPACE</span>
          <span className="grow" />
          <span className="bp-coord">{total} tools visible</span>
          <span className="bp-coord">·</span>
          <span className="bp-coord">ESC home</span>
        </div>
      </div>
    </div>
  );
}
