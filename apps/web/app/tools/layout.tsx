'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOOLS } from '@/lib/tools';
import { TOOL_CATEGORIES } from '@/utils';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTool = TOOLS.find((t) => t.path === pathname);
  const categoryLabel = activeTool
    ? (TOOL_CATEGORIES[activeTool.category as keyof typeof TOOL_CATEGORIES] ?? activeTool.category)
    : null;

  // Don't render the topbar on the /tools grid page itself
  const isGrid = pathname === '/tools';

  return (
    <div className='h-full flex flex-col' style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {!isGrid && (
        <div className='flex items-center gap-3 px-4 py-3 border-b border-[hsla(0,0%,20%,1)] bg-[#121212]' style={{ minHeight: 48 }}>
          <Link
            href='/tools'
            className='flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors font-mono tracking-wide'
          >
            <span style={{ fontSize: 14 }}>←</span>
            <span>All tools</span>
          </Link>
          {categoryLabel && (
            <>
              <span className='text-neutral-700 text-xs'>/</span>
              <span className='text-xs text-neutral-500 font-mono'>{categoryLabel}</span>
            </>
          )}
          {activeTool && (
            <>
              <span className='text-neutral-700 text-xs'>/</span>
              <span className='text-xs text-neutral-300 font-mono'>{activeTool.name}</span>
            </>
          )}
          <div className='ml-auto flex items-center gap-1.5'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
            <span className='text-xs text-neutral-500 font-mono'>local · browser</span>
          </div>
        </div>
      )}
      <div className='flex-1 min-h-0'>
        {children}
      </div>
    </div>
  );
}
