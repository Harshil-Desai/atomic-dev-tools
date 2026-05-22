# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root unless noted.

```bash
# Development
pnpm dev              # Start Next.js dev server (apps/web on :3000)
pnpm build            # Production build via Turborepo
pnpm lint             # ESLint across all packages
pnpm type-check       # tsc --noEmit across all packages

# From apps/web directly (for targeted checks)
cd apps/web && npx tsc --noEmit   # Type-check web app only
cd apps/web && npm run build      # Build web app only

# Scaffold a new tool
pnpm new:tool         # Interactive generator in scripts/
```

## Monorepo Structure

```
apps/web/             Next.js 14 App Router — the entire user-facing product
packages/ui/          Shared component library (Button, Card, Input, Textarea, etc.)
packages/utils/       Tool type definitions and category registry
scripts/              Tool scaffolding generator
```

## Adding a New Tool

Two files always need updating together:

1. **`packages/utils/tool-registry.ts`** — defines the `Tool` interface and `TOOL_CATEGORIES`. If the tool needs a new category, add it to both the `category` union type and the `TOOL_CATEGORIES` object.

2. **`apps/web/lib/tools.ts`** — the `TOOLS` array. Import the Lucide icon here and add an entry with `id`, `name`, `description`, `icon`, `category`, and `path`.

3. **`apps/web/app/tools/<tool-id>/page.tsx`** — the actual page component. All tool pages use `'use client'` and import shared components from `@/ui`.

The tool `path` must match the directory name under `app/tools/`.

## Key Architectural Constraints

**TypeScript target is ES2017** (`apps/web/tsconfig.json`). This means:
- No BigInt literal syntax (`123n`) — use `BigInt(123)` or `BigInt('123')` instead
- BigInt is available as a runtime value but not as a literal

**All tools are fully client-side** (`'use client'`). The only server-side code is `apps/web/app/api/port-check/route.ts` (TCP connectivity check via Node.js `net.Socket`).

**Heavy dependencies are page-local**, not shared. `gpt-tokenizer` (1 MB), `bcryptjs`, `hash-wasm`, `js-yaml`, etc. are imported only inside the tool page that needs them — Next.js lazy-loads them per route.

**Lucide icon version is `0.263.1`** — use only icons available in that version. All icons for the tool registry are imported in `apps/web/lib/tools.ts`.

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@/ui` | `packages/ui` |
| `@/utils` | `packages/utils` |
| `@/*` | `apps/web/*` (app root) |

## Styling

Tailwind CSS with a dark-only design system. Background tokens: `#0a0a0a` (page), `#121212` (surfaces), `#1C1C1C` (elevated). Border color: `hsla(0,0%,20%,1)`. All tool pages use this layout shell:

```tsx
<div className='h-full flex flex-col'>
  <div className='border-b border-[hsla(0,0%,20%,1)] bg-[#1C1C1C] p-4 sm:p-5 md:p-6'>
    {/* title + subtitle */}
  </div>
  <div className='flex-1 overflow-auto p-4 sm:p-5 md:p-6'>
    {/* tool content */}
  </div>
</div>
```
