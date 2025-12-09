'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, ChevronDown, ChevronRight, Github, Menu, X } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { TOOL_CATEGORIES } from '@/utils';

export function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className='fixed lg:hidden top-4 right-4 z-50 p-2 rounded-md bg-[#1C1C1C] border border-[#333333] hover:border-white/20 transition-colors'
        aria-label='Toggle menu'
      >
        {mobileMenuOpen ? (
          <X className='w-5 h-5 text-white' />
        ) : (
          <Menu className='w-5 h-5 text-white' />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className='fixed inset-0 bg-black/50 lg:hidden z-30'
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static w-64 border-r border-[#333333] bg-[#1C1C1C] flex flex-col glass-teal transition-all duration-300 z-40 h-screen lg:h-auto ${
        mobileMenuOpen ? 'left-0' : '-left-64 lg:left-0'
      }`}>
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
                          onClick={closeMobileMenu}
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
          <p className='text-xs text-[#999999] border-[#333333]/50'>
            Made for developers who value their time
          </p>
      </div>
      </aside>
    </>
  );
}