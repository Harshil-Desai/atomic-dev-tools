import { Sidebar } from '@/components/sidebar';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-background text-foreground'>
      <div className='flex h-screen overflow-hidden'>
        <Sidebar />
        <div className='flex-1 flex flex-col overflow-hidden'>
          <main className='flex-1 overflow-auto p-4 sm:p-5 md:p-6 lg:p-8'>
            <div className='mx-auto max-w-full lg:max-w-7xl'>
              {children}
            </div>
          </main>
          <footer className='border-t border-border px-4 sm:px-5 md:px-6 lg:px-8 py-3 text-xs text-muted-foreground'>
            <div className='flex items-center justify-between'>
              <span>Developer Tools v1.0</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}