'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TOOLS } from '@/lib/tools';
import { TOOL_CATEGORIES } from '@/utils';

type Theme = 'dark' | 'light';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const pathname = usePathname();

  const activeTool = TOOLS.find((t) => t.path === pathname);
  const categoryLabel = activeTool
    ? (TOOL_CATEGORIES[activeTool.category as keyof typeof TOOL_CATEGORIES] ?? activeTool.category)
    : null;

  return (
    <div className="adt adt-tools" data-theme={theme}>
      <Sidebar theme={theme} onThemeChange={setTheme} />

      <div className="t-main">
        {/* Breadcrumb topbar */}
        <div className="t-topbar">
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

        {/* Tool content */}
        <div className="t-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
