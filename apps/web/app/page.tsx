"use client"
import { useState } from 'react';
import Link from 'next/link';
import {
  Zap, Sun, Moon, Github, ArrowRight, Search,
  Database, Hash, Send, Sparkles, Layers, Shield,
} from 'lucide-react';
import { TOOLS } from '../lib/tools';

type Theme = 'dark' | 'light';

const CATEGORY_LABELS: Record<string, string> = {
  api: 'API',
  data: 'Data',
  text: 'Text',
  time: 'Time',
  ffmpeg: 'FFmpeg',
};

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="theme-toggle" role="tablist" aria-label="Theme">
      <span
        className="knob"
        style={{
          width: 70,
          transform: theme === 'light' ? 'translateX(0)' : 'translateX(70px)',
        }}
      />
      <button
        type="button"
        className={theme === 'light' ? 'is-on' : ''}
        onClick={() => onChange('light')}
      >
        <Sun size={13} /> Light
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'is-on' : ''}
        onClick={() => onChange('dark')}
      >
        <Moon size={13} /> Dark
      </button>
    </div>
  );
}

export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>('dark');
  const featuredTools = TOOLS.slice(0, 8);

  return (
    <div className="adt adt-landing" data-theme={theme}>
      {/* Topbar */}
      <header className="adt-topbar">
        <div className="brand">
          <span className="brand-mark"><Zap size={14} /></span>
          Atomic
          <span className="brand-sub">Dev Tools</span>
        </div>
        <nav className="nav-links">
          <Link href="/tools">Tools</Link>
          <a href="#principles">Principles</a>
          <a href="https://github.com/Harshil-Desai/atomic-dev-tools" target="_blank" rel="noopener noreferrer">Changelog</a>
        </nav>
        <div className="topbar-right">
          <ThemeToggle theme={theme} onChange={setTheme} />
          <a
            href="https://github.com/Harshil-Desai/atomic-dev-tools"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-icon"
            aria-label="GitHub"
          >
            <Github size={14} />
          </a>
          <Link href="/tools" className="btn btn-primary">
            Open app <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="eyebrow">
            <span className="dot" />
            <span>15 tools shipped</span>
            <span className="pipe">·</span>
            <span className="ver">v1.4.0 — auto-paste</span>
          </div>

          <h1>
            Developer utilities,{' '}
            <span className="strike">bloated apps</span>{' '}
            <span className="accent">refined.</span>
          </h1>

          <p className="lede">
            Sub-second load. Zero installs. Single-purpose tools that respect your time —
            and your shortcuts.
          </p>

          <div className="hero-cta">
            <Link href="/tools" className="btn btn-accent btn-lg">
              Browse tools <ArrowRight size={14} />
            </Link>
            <button type="button" className="btn btn-ghost btn-lg">
              <span className="mono" style={{ fontSize: 12 }}>⌘K</span> Open command bar
            </button>
          </div>

          {/* Command palette teaser */}
          <div className="command-card">
            <div className="command-head">
              <span className="traffic"><span /><span /><span /></span>
              <div className="input">
                <Search size={13} />
                <span>base64<span className="cursor-blink" /></span>
              </div>
              <span className="kbd">esc</span>
            </div>
            <ul className="command-list">
              <li className="active">
                <span className="ico"><Database size={14} /></span>
                <span>
                  <div className="name">Base64 Encoder / Decoder</div>
                  <div className="desc">Encode or decode text · binary safe</div>
                </span>
                <span className="meta">data ↵</span>
              </li>
              <li>
                <span className="ico"><Hash size={14} /></span>
                <span>
                  <div className="name">Hash Generator</div>
                  <div className="desc">MD5 · SHA-1 · SHA-256 · SHA-512</div>
                </span>
                <span className="meta">data</span>
              </li>
              <li>
                <span className="ico"><Send size={14} /></span>
                <span>
                  <div className="name">API Tester</div>
                  <div className="desc">Send a request — preview the body</div>
                </span>
                <span className="meta">api</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="section" id="principles">
        <div className="section-head">
          <div>
            <div className="label-mono">— Principles</div>
            <h2>Built around how you actually work.</h2>
          </div>
          <p>Every tool is engineered to load instantly, hold focus, and stay out of the way of your terminal.</p>
        </div>

        <div className="features">
          <div className="feature">
            <span className="num">01</span>
            <div className="ico"><Sparkles size={16} /></div>
            <h3>Sub-second start</h3>
            <p>Cold-start in under 500ms on any modern device. No splash screens, no auth walls, no telemetry beacons.</p>
          </div>
          <div className="feature">
            <span className="num">02</span>
            <div className="ico"><Layers size={16} /></div>
            <h3>One job, perfectly</h3>
            <p>Each utility is single-purpose. Less surface area means fewer bugs, sharper UX, and predictable shortcuts.</p>
          </div>
          <div className="feature">
            <span className="num">03</span>
            <div className="ico"><Shield size={16} /></div>
            <h3>Local first, always</h3>
            <p>Your input never leaves the browser. Hashes, diffs, formatting — everything runs on your machine.</p>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="v">15<small>tools</small></div>
            <div className="l">Shipped</div>
          </div>
          <div className="stat">
            <div className="v">412<small>ms</small></div>
            <div className="l">P95 cold start</div>
          </div>
          <div className="stat">
            <div className="v">0<small>kb</small></div>
            <div className="l">Tracking</div>
          </div>
          <div className="stat">
            <div className="v">100<small>%</small></div>
            <div className="l">Open source</div>
          </div>
        </div>
      </section>

      {/* Tool catalog */}
      <section className="section" id="tools">
        <div className="section-head">
          <div>
            <div className="label-mono">— Library</div>
            <h2>A growing catalog.</h2>
          </div>
          <p>Hand-picked tools developers reach for daily. Click any tile to launch — no install, no signup.</p>
        </div>

        <div className="tool-grid">
          {featuredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link href={tool.path} key={tool.id} className="tile">
                <div className="row">
                  <span className="ico"><Icon size={14} /></span>
                  <span className="cat">{CATEGORY_LABELS[tool.category] ?? tool.category}</span>
                </div>
                <div>
                  <h4>{tool.name}</h4>
                  <p>{tool.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="adt-footer">
        <div className="left">
          <span className="brand-mark" style={{ width: 22, height: 22, borderRadius: 5 }}>
            <Zap size={11} />
          </span>
          <span>Atomic Dev Tools</span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span>MIT licensed</span>
        </div>
        <div className="right">
          <a href="https://github.com/Harshil-Desai/atomic-dev-tools" target="_blank" rel="noopener noreferrer">
            GITHUB
          </a>
          <a href="#changelog">CHANGELOG</a>
          <span style={{ color: 'var(--text-faint)' }}>v1.4.0</span>
        </div>
      </footer>
    </div>
  );
}
