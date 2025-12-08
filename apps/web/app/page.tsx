"use client"
import Link from 'next/link';
import { Button } from '@/ui';
import { Zap, Github, Sparkles, Clock, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className='min-h-screen relative overflow-hidden bg-background'>
      {/* Background texture */}
      <div className="absolute inset-0 bg-grid opacity-10" />

      {/* Cyan glow orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-color-4/10 rounded-full blur-3xl animate-pulse" />

      <div className='container mx-auto px-4 py-16 relative'>
        {/* Header */}
        <header className='flex items-center justify-between mb-20'>
          <div className='flex items-center gap-3'>
            <div className="p-2 bg-card rounded-lg border border-border hover-lift transition-all">
              <Zap className='w-6 h-6 text-primary' />
            </div>
            <span className='text-2xl font-semibold tracking-tight text-foreground'>Atomic Tools</span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href='https://github.com/Harshil-Desai'
              target='_blank'
              rel='noopener noreferrer'
              className="p-2 hover:bg-card rounded-md transition-colors border border-border hover:border-primary/30"
            >
              <Github className='w-5 h-5 text-secondary hover:text-primary transition-colors' />            </a>
          </nav>
        </header>

        {/* Hero Section */}
        <div className='max-w-3xl mx-auto text-center mb-24'>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-primary/20 mb-8 animate-pulse-warm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-secondary">No installation required</span>
          </div>

          <h1 className='text-4xl md:text-6xl font-medium text-foreground mb-6 leading-tight'>
            Developer tools that
            <span className='block mt-3 text-primary'>
              stay out of your way
            </span>
          </h1>

          <p className='text-lg text-secondary mb-10 max-w-xl mx-auto leading-relaxed'>
            Purpose-built utilities for developers. No bloat, no sign-ups, just tools that work when you need them.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href='/tools'>
              <Button size='lg' className="px-8 hover-lift surface-primary">
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
                icon: <Clock className="w-5 h-5 text-primary" />,
                title: 'Zero Setup',
                description: 'Start immediately. No accounts, installations, or configuration needed.'
              },
              {
                icon: <Zap className="w-5 h-5 text-primary" />,
                title: 'Single Purpose',
                description: 'Each tool solves one specific problem exceptionally well.'
              },
              {
                icon: <Globe className="w-5 h-5 text-primary" />,
                title: 'Always Available',
                description: 'Access from any device, anywhere. Your work stays in the browser.'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`
                  card-teal p-6 hover-lift group
                  ${i === 1 ? 'card-warm' : ''}
                  ${i === 2 ? 'card-crimson' : ''}
                `}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-muted mb-4 group-hover:bg-primary/20 transition-colors">
                  <div className="group-hover:scale-110 transition-transform duration-200">
                    {feature.icon}
                  </div>
                </div>
                <h3 className='text-lg font-medium text-foreground mb-2'>{feature.title}</h3>
                <p className='text-sm text-muted-foreground leading-relaxed'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-24 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Built by developers, for developers.
          </p>
        </div>
      </div>
    </div>
  );
}