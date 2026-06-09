'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOOLS } from '@/lib/tools';

const CAT_TO_DATA: Record<string, string> = {
  api: 'api', data: 'data', text: 'text', time: 'time',
  security: 'security', backend: 'backend', infra: 'systems',
  ffmpeg: 'ffmpeg', ai: 'ai',
};

const CAT_CODES: Record<string, string> = {
  api: 'A', data: 'D', text: 'T', time: 'TM',
  security: 'S', infra: 'G', backend: 'B', ffmpeg: 'FF', ai: 'AI',
};

const CAT_LABELS: Record<string, string> = {
  api: 'API & NETWORKING', data: 'DATA & ENCODING', text: 'TEXT & CODE',
  time: 'TIME & IDS', security: 'SECURITY', infra: 'SYSTEMS & INFRA',
  backend: 'BACKEND & ARCH', ffmpeg: 'FFMPEG TOOLS', ai: 'AI & LLM',
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTool = TOOLS.find((t) => t.path === pathname);
  const isGrid = pathname === '/tools';

  const categoryKey = activeTool?.category ?? null;
  const dataCat = categoryKey ? (CAT_TO_DATA[categoryKey] ?? categoryKey) : null;
  const catCode = categoryKey ? (CAT_CODES[categoryKey] ?? categoryKey.toUpperCase()) : null;
  const catLabel = categoryKey ? (CAT_LABELS[categoryKey] ?? categoryKey.toUpperCase()) : null;

  return (
    <div className='bp-tool-root h-full flex flex-col' data-cat={dataCat ?? undefined} style={{ minHeight: '100vh' }}>
      {!isGrid && (
        <div className='tool-topbar'>
          <Link href='/tools' className='tool-back-btn'>← grid</Link>
          <span className='tool-sep'>/</span>
          {catCode && catLabel && (
            <>
              <span className='tool-cat-chip'>
                <span className='dot' />
                {catCode} · {catLabel}
              </span>
              <span className='tool-sep'>/</span>
            </>
          )}
          {activeTool && <span className='tool-name'>{activeTool.name}</span>}
          <span className='tool-spacer' />
          <span className='tool-status-live'>live · local</span>
          <button className='tool-ghost-btn'>⌘ K</button>
          <Link href='/tools' className='tool-ghost-btn'>pick another</Link>
        </div>
      )}
      <div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
        {children}
      </div>
      {!isGrid && (
        <div className='tool-foot'>
          {catCode && activeTool && (
            <span>DWG · {catCode}-{activeTool.id.toUpperCase()}</span>
          )}
          <span className='tool-spacer' />
          <span>100% client-side</span>
          <span>·</span>
          <span>⌘C copy · ESC → grid</span>
        </div>
      )}
    </div>
  );
}
