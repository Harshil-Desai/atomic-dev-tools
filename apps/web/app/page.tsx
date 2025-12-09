"use client"
import Link from 'next/link';
import { Button } from '@/ui';
import { Zap, Github, Sparkles, Clock, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className='min-h-screen relative overflow-hidden bg-[#121212]'>
      {/* Background texture */}
      <div className="absolute inset-0 bg-grid-teal opacity-10" />

      {/* Subtle white gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/3 to-transparent rounded-full blur-3xl" />

      <div className='container mx-auto px-4 py-16 relative'>
        {/* Header */}
        <header className='flex items-center justify-between mb-20'>
          <div className='flex items-center gap-3'>
            <div className="p-2 bg-[#1C1C1C] rounded-lg border border-[#333333]/50 hover-lift hover:border-white/20">
              <Zap className='w-6 h-6 text-white' />
            </div>
            <span className='text-2xl font-semibold tracking-tight text-[#F2F2F2]'>Atomic Tools</span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href='https://github.com/Harshil-Desai'
              target='_blank'
              rel='noopener noreferrer'
              className="p-2 hover:bg-[#1C1C1C] rounded-md transition-colors border border-[#333333]/50 hover:border-white/20"
            >
              <Github className='w-5 h-5 text-[#D9D9D9]' />
            </a>
          </nav>
        </header>

        {/* Hero Section */}
        <div className='max-w-3xl mx-auto text-center mb-24'>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1C1C1C] border border-white/10 mb-8 animate-pulse-warm">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm text-[#D9D9D9]">No installation required</span>
          </div>

          <h1 className='text-4xl md:text-6xl font-medium text-[#F2F2F2] mb-6 leading-tight'>
            Developer tools that
            <span className='block mt-3 text-white text-glow'>
              stay out of your way
            </span>
          </h1>

          <p className='text-lg text-[#D9D9D9]/80 mb-10 max-w-xl mx-auto leading-relaxed'>
            Purpose-built utilities for developers. No bloat, no sign-ups, just tools that work when you need them.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href='/tools'>
              <Button size='lg' className="px-8 hover-lift bg-white text-black hover:bg-[#D9D9D9]">
                Browse Tools
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className='max-w-4xl mx-auto'>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Clock className="w-5 h-5 text-white" />,
                title: 'Zero Setup',
                description: 'Start immediately. No accounts, installations, or configuration needed.'
              },
              {
                icon: <Zap className="w-5 h-5 text-white" />,
                title: 'Single Purpose',
                description: 'Each tool solves one specific problem exceptionally well.'
              },
              {
                icon: <Globe className="w-5 h-5 text-white" />,
                title: 'Always Available',
                description: 'Access from any device, anywhere. Your work stays in the browser.'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-[#1C1C1C] border border-[#333333] p-6 rounded-lg hover-lift group hover:border-white/20 transition-all"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-[#121212]/80 mb-4 group-hover:bg-white/5 transition-colors border border-[#333333]/50">
                  <div className="group-hover:scale-110 transition-transform duration-200">
                    {feature.icon}
                  </div>
                </div>
                <h3 className='text-lg font-medium text-[#F2F2F2] mb-2'>{feature.title}</h3>
                <p className='text-sm text-[#D9D9D9]/70 leading-relaxed'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-24 pt-8 border-t border-[#333333]/50 text-center">
          <p className="text-sm text-[#999999]">
            Built by developers, for developers.
          </p>
        </div>
      </div>
    </div>
  );
}