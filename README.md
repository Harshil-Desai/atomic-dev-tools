# Atomic Dev Tools 🚀

> Lightweight developer utilities that just work. No bloat, no waiting, no installation.

## Philosophy

Every developer has experienced this: you need to test an API, convert some Base64, or format JSON. But first, you have to launch a 500MB desktop app that takes 30 seconds to load. **This is productivity murder.**

Atomic Dev Tools fixes this. Each tool:

- ⚡ **Loads instantly** - No splash screens, no loading bars
- 🎯 **Single purpose** - Does one thing perfectly
- 🌐 **Browser-based** - Works anywhere, no installation
- 🎨 **Beautiful** - Dark mode, clean UI, keyboard shortcuts

## Quick Start

```bash
# Run the setup script
chmod +x setup.sh
./setup.sh

# Or manually:
cd atomic-dev-tools
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
atomic-dev-tools/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/
│       │   ├── page.tsx        # Landing page
│       │   ├── layout.tsx      # Root layout
│       │   ├── globals.css     # Global styles
│       │   └── tools/          # Tool pages
│       │       ├── layout.tsx  # Tools layout (sidebar)
│       │       ├── page.tsx    # Redirect to first tool
│       │       └── api-tester/ # Example tool
│       ├── components/
│       │   └── sidebar.tsx     # Navigation sidebar
│       └── lib/
│           └── tools.ts        # Tool registry
├── packages/
│   ├── ui/                     # Shared UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── index.tsx
│   └── utils/                  # Shared utilities
│       ├── tool-registry.ts
│       └── index.ts
└── scripts/
    └── create-tool.js          # Tool scaffold generator
```

## Adding a New Tool

### Option 1: Use the generator (Recommended)

```bash
pnpm new:tool base64-encoder
```

This creates a template at `apps/web/app/tools/base64-encoder/page.tsx`

### Option 2: Manual creation

1. **Create the tool page:**

```typescript
// apps/web/app/tools/your-tool/page.tsx
'use client';

import { useState } from 'react';
import { Button, Card, CardContent } from '@/ui';

export default function YourToolPage() {
  return (
    <div className='h-full flex flex-col'>
      <div className='border-b border-gray-800 bg-gray-900 p-6'>
        <h1 className='text-2xl font-bold text-white mb-2'>Your Tool</h1>
        <p className='text-gray-400'>Description</p>
      </div>
      <div className='flex-1 overflow-auto p-6'>{/* Tool content */}</div>
    </div>
  );
}
```

2. **Register the tool:**

```typescript
// apps/web/lib/tools.ts
import { YourIcon } from 'lucide-react';

export const TOOLS: Tool[] = [
  // ... existing tools
  {
    id: 'your-tool',
    name: 'Your Tool',
    description: 'What it does',
    icon: YourIcon,
    category: 'text', // or 'api', 'data', 'ffmpeg', 'time'
    path: '/tools/your-tool',
  },
];
```

3. **Done!** Your tool now appears in the sidebar.

## Using Cursor AI

This project is optimized for Cursor AI development:

### Quick Commands

```bash
# In Cursor, use these prompts:

# Add a new tool
"Add a Base64 encoder/decoder tool following the API Tester pattern"

# Fix TypeScript errors
"@workspace Fix all TypeScript errors"

# Refactor common code
"Extract common form patterns into a useToolForm hook"

# Add a feature
"Add keyboard shortcuts (Cmd+Enter to submit) to all tool forms"
```

### Best Practices with Cursor

1. **Use Composer (Cmd+L)** for multi-file changes
2. **Use Chat (Cmd+K)** for single-file edits
3. **Reference files with @**: `@api-tester/page.tsx`
4. **Be specific**: "Add X that does Y" instead of "improve this"

See `.cursorrules` for project-specific AI instructions.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Monorepo**: Turborepo + pnpm workspaces

## Available Tools

### ✅ Implemented

- **API Tester** - Test HTTP endpoints without Postman
  - All HTTP methods
  - Custom headers and body
  - Response time tracking
  - Pretty-printed JSON

### 🚧 Planned

**Text & Code**

- Format-Aware Diff (semantic code comparison)
- Text Escape/Unescape (URL, HTML, JS)
- Code Minifier/Beautifier
- String Case Converter

**Data & Encoding**

- Base64 Encoder/Decoder
- JSON ↔ YAML Converter
- Hash/Checksum Generator (MD5, SHA)

**FFmpeg Tools**

- Video Clipper & Converter
- Subtitle/Watermark Burner
- Audio Extractor & Resampler
- Video Resize & Scale

**Time & IDs**

- Epoch Time Converter
- UUID Generator (v4, v7)

**API & Network**

- CORS/Preflight Checker
- WebSocket Tester
- DNS Lookup

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Type check all packages
pnpm type-check

# Build for production
pnpm build

# Lint
pnpm lint
```

## Future Plans

### Phase 1: Core Tools (Current)

- Launch with 5-10 essential tools
- Perfect the UX and performance
- Gather user feedback

### Phase 2: SaaS Features

- User accounts (optional)
- Tool history and favorites
- Custom tool configurations
- API access for integrations

### Phase 3: Advanced Features

- FFmpeg video processing service
- Collaborative features (share tool states)
- Browser extension
- CLI tool for command-line access

### Phase 4: Monetization

- Free tier: All text tools, limited FFmpeg
- Pro tier ($9/mo): Unlimited everything, API keys, priority support
- Team tier ($49/mo): Shared tool configs, team analytics

## Contributing

We welcome contributions! Here's how:

1. **Add a tool**: Use `pnpm new:tool <name>` and open a PR
2. **Fix bugs**: Check issues, fix, and submit PR
3. **Improve docs**: Better examples, guides, videos
4. **Spread the word**: Star, share, tweet about it

## Why Another Dev Tools Site?

Good question. Here's what makes us different:

| Feature      | Atomic Dev Tools | Others       |
| ------------ | ---------------- | ------------ |
| Load time    | <100ms           | 2-30s        |
| Installation | None             | Required     |
| Ads          | None             | Everywhere   |
| Tracking     | Minimal          | Excessive    |
| Updates      | Instant          | Version hell |
| Mobile       | Yes              | Often no     |

## License

MIT - Use it, fork it, make it better.

## Credits

Built with frustration from waiting for Postman to load.

Inspired by developers who value their time.

---

**Made for developers, by developers.** 💙

[Website](https://atomicdevtools.com) • [GitHub](https://github.com) • [Twitter](https://twitter.com)
