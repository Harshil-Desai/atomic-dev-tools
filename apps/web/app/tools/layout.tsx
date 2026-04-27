'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TOOLS } from '@/lib/tools';
import { TOOL_CATEGORIES } from '@/utils';

type Theme = 'dark' | 'light';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const activeTool = TOOLS.find((t) => t.path === pathname);
  const categoryLabel = activeTool
    ? (TOOL_CATEGORIES[activeTool.category as keyof typeof TOOL_CATEGORIES] ?? activeTool.category)
    : null;

  return (
    // NOTE: intentionally NOT using the .adt class here — that class adds
    // `overflow:hidden` + `position:relative` + z-index rules on direct children
    // which conflict with the grid layout. Use a dedicated .ws-root wrapper instead.
    <div className="ws-root" data-theme={theme}>

      {/* Mobile backdrop — only rendered when drawer is open */}
      {mobileOpen && (
        <div
          className="ws-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Grid item 1: sidebar (exactly one DOM node) */}
      <Sidebar
        theme={theme}
        onThemeChange={setTheme}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Grid item 2: main content column */}
      <div className="ws-main">
        {/* Topbar with breadcrumb */}
        <div className="ws-topbar">
          {/* Hamburger — hidden on desktop, visible on mobile via CSS */}
          <button
            className="ws-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={16} />
          </button>

          <div className="t-crumb">
            <span>Tools</span>
            {categoryLabel && (
              <>
                <span className="t-sep">/</span>
                <span>{categoryLabel}</span>
              </>
            )}
            {activeTool && (
              <>
                <span className="t-sep">/</span>
                <span className="t-now">{activeTool.name}</span>
              </>
            )}
          </div>

          <div className="t-topbar-actions">
            <span className="t-status-pill">
              <span className="t-dot" />
              Local · all browser
            </span>
          </div>
        </div>

        {/* Tool page fills remaining height */}
        <div className="ws-content">
          {children}
        </div>
      </div>
    </div>
  );
}
