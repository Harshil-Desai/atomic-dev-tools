'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, ChevronDown, Sun, Moon, Menu, X } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { TOOL_CATEGORIES } from '@/utils';

type Theme = 'dark' | 'light';

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
      <button type="button" className={theme === 'light' ? 'is-on' : ''} onClick={() => onChange('light')}>
        <Sun size={12} /> Light
      </button>
      <button type="button" className={theme === 'dark' ? 'is-on' : ''} onClick={() => onChange('dark')}>
        <Moon size={12} /> Dark
      </button>
    </div>
  );
}

interface SidebarProps {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

export function Sidebar({ theme, onThemeChange }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');

  const toggleCat = (cat: string) =>
    setCollapsed((prev: Record<string, boolean>) => ({ ...prev, [cat]: !prev[cat] }));

  // Build category groups from tools, filtering by search query
  const groups = Object.entries(
    TOOLS.reduce<Record<string, typeof TOOLS>>((acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push(tool);
      return acc;
    }, {})
  )
    .map(([cat, tools]) => ({
      cat,
      label: TOOL_CATEGORIES[cat as keyof typeof TOOL_CATEGORIES] ?? cat,
      tools: query
        ? tools.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
        : tools,
    }))
    .filter((g) => g.tools.length > 0);

  // Find active tool for breadcrumb display
  const activeTool = TOOLS.find((t) => t.path === pathname);

  const closeMobile = () => setMobileOpen(false);

  const SidebarContent = (
    <aside className={`t-sidebar${mobileOpen ? ' open' : ''}`}>
      {/* Header / brand */}
      <div className="t-side-head">
        <div className="brand">
          <Link href="/" className="brand-mark" style={{ width: 28, height: 28 }} aria-label="Home">
            <Zap size={14} />
          </Link>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>
            Atomic
          </Link>
          <span className="brand-sub">v1.4</span>
        </div>
        {/* mobile close */}
        <button
          onClick={closeMobile}
          style={{
            marginLeft: 'auto',
            display: 'grid',
            placeItems: 'center',
            width: 26,
            height: 26,
            background: 'none',
            border: 'none',
            color: 'var(--text-mute)',
            cursor: 'pointer',
          }}
          className="lg:hidden"
          aria-label="Close menu"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="t-search">
        <span className="t-search-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          placeholder="Search tools…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="t-search-kbd">⌘K</span>
      </div>

      {/* Categories + tools */}
      <nav className="t-cats">
        {groups.map(({ cat, label, tools }) => {
          const isCollapsed = collapsed[cat];
          return (
            <div key={cat}>
              <button
                className="t-cat-head"
                onClick={() => toggleCat(cat)}
              >
                <ChevronDown
                  size={11}
                  style={{
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
                    transition: 'transform .15s',
                    flexShrink: 0,
                  }}
                />
                {label}
                <span className="t-cat-count">{tools.length}</span>
              </button>

              {!isCollapsed && tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = pathname === tool.path;
                return (
                  <Link
                    key={tool.id}
                    href={tool.path}
                    className={`t-tool${isActive ? ' active' : ''}`}
                    onClick={closeMobile}
                  >
                    <span className="t-tool-ico"><Icon size={14} /></span>
                    {tool.name}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="t-side-foot">
        <span className="t-avatar">HD</span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          <span style={{ color: 'var(--text)', fontSize: 12.5, fontWeight: 500 }}>Local workspace</span>
          <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>No account · all browser</span>
        </div>
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="t-mobile-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        style={{ position: 'fixed', top: 10, left: 10, zIndex: 50 }}
      >
        <Menu size={16} />
      </button>

      {/* Mobile overlay */}
      <div
        className={`t-mobile-overlay${mobileOpen ? ' open' : ''}`}
        onClick={closeMobile}
      />

      {SidebarContent}
    </>
  );
}
