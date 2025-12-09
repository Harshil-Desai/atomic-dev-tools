'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, ChevronDown, ChevronRight, Github } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { TOOL_CATEGORIES } from '@/utils';

export function Sidebar() {
  const pathname = usePathname();

  const toolsByCategory = TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof TOOLS>);

  // Initialize collapsed state - all categories expanded by default
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <aside className='w-64 border-r border-[#333333] bg-[#1C1C1C] flex flex-col glass-teal'>
      {/* Logo */}
      <div className='p-5 border-b border-[#333333]'>
        <Link href='/' className='flex items-center gap-3 text-[#F2F2F2] hover:text-white transition-colors group'>
          <div className="p-2 bg-[#121212]/50 rounded-md group-hover:bg-white/5 transition-colors">
            <Zap className='w-5 h-5 text-white' />
          </div>
          <div className="flex flex-col">
            <span className='font-semibold text-lg tracking-tight'>Atomic Tools</span>
            <span className="text-xs text-[#999999]">Developer utilities</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className='flex-1 overflow-y-auto p-4'>
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-[#999999] font-medium px-3 py-2">
            Navigation
          </div>
        </div>

        {Object.entries(toolsByCategory).map(([category, tools]) => {
          const isCollapsed = collapsedCategories[category];
          return (
            <div key={category} className='mb-3'>
              <button
                onClick={() => toggleCategory(category)}
                className='w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#D9D9D9] hover:text-white transition-colors rounded-md hover:bg-white/5 group'
              >
                <div className="transition-transform duration-200 group-hover:scale-110">
                  {isCollapsed ?
                    <ChevronRight className='w-3.5 h-3.5 text-white' /> :
                    <ChevronDown className='w-3.5 h-3.5 text-white' />
                  }
                </div>
                <span className="text-left">
                  {TOOL_CATEGORIES[category as keyof typeof TOOL_CATEGORIES]}
                </span>
                <span className="ml-auto text-xs text-[#999999] bg-[#121212]/50 px-1.5 py-0.5 rounded">
                  {tools.length}
                </span>
              </button>

              {!isCollapsed && (
                <ul className='space-y-1 mt-1 ml-8 pl-1'>
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = pathname === tool.path;
                    return (
                      <li key={tool.id}>
                        <Link
                          href={tool.path}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group ${isActive
                            ? 'bg-white text-black shadow-sm hover:bg-[#D9D9D9]'
                            : 'text-[#999999] hover:text-[#F2F2F2] hover:bg-white/5'
                            }`}
                        >
                          <div className={`p-1.5 rounded ${isActive
                            ? 'bg-black/10 group-hover:bg-black/15'
                            : 'bg-[#121212]/50 group-hover:bg-white/5'
                            }`}>
                            <Icon className='w-3.5 h-3.5 flex-shrink-0' />
                          </div>
                          <span className='text-sm font-medium'>{tool.name}</span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black animate-pulse-warm" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className='p-4 border-t border-[#333333] mt-auto'>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#999999]">
            <div className="w-2 h-2 rounded-full bg-white animate-soft-pulse" />
            <span>All systems operational</span>
          </div>

          <a
            href='https://github.com/Harshil-Desai'
            target='_blank'
            rel='noopener noreferrer'
            className="flex items-center gap-2 text-sm text-[#D9D9D9] hover:text-white transition-colors group"
          >
            <div className="p-1.5 bg-[#121212]/50 rounded group-hover:bg-white/5 transition-colors">
              <Github className='w-4 h-4' />
            </div>
            <span>View on GitHub</span>
          </a>

          <p className='text-xs text-[#999999] pt-2 border-t border-[#333333]/50'>
            Made for developers who value their time
          </p>
        </div>
      </div>
    </aside>
  );
}