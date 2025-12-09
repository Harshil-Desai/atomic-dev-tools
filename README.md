# Atomic Dev Tools

> Lightweight developer utilities that just work. No bloat, no waiting, no installation.

-----

## Philosophy

Every developer has encountered the delay: needing to perform a simple task like testing an API, converting Base64, or formatting JSON, only to be forced to launch a large desktop application that takes significant time to load. **This constant interruption is a drain on productivity.**

Atomic Dev Tools is built to eliminate this friction. Each tool is designed to be:

  * **Instantly Accessible** - Zero splash screens or loading bars.
  * **Single-Purpose** - Focused on doing one task perfectly.
  * **Browser-Based** - Works universally, requiring no local installation.
  * **User-Centric** - Features a clean, dark-mode-first interface and full keyboard shortcut support.

-----

## Getting Started

This project is a web application accessible via a development server.

### Prerequisites

You will need **Node.js** and the **pnpm** package manager installed on your system.

### Manual Setup

1.  Clone the repository and navigate into the project directory:

    ```text
    atomic-dev-tools/
    ```

2.  Install all project dependencies:

3.  Start the local development server:

The application will be accessible in your browser at the local host address.

-----

## Project Architecture

Atomic Dev Tools uses a **monorepo** structure managed by **Turborepo** and **pnpm** workspaces.

  * **`apps/web/`**: The core application built with **Next.js 14 (App Router)**. This contains the main layout, landing page, and all individual tool pages.
  * **`packages/ui/`**: A collection of **shared UI components** (e.g., buttons, cards, inputs) used across the application.
  * **`packages/utils/`**: Utility functions and the tool registration logic shared between the application and packages.
  * **`scripts/`**: Contains utility scripts, such as the generator for scaffolding new tools.

-----

## Adding a New Tool

New tools are added by creating a component and registering it within the application.

### Option 1: Use the generator (Recommended)

Run the scaffolding script with your desired tool name (e.g., `base64-encoder`).

This will automatically create a template file ready for development at `apps/web/app/tools/<tool-name>/page.tsx`.

### Option 2: Manual creation

1.  **Create the tool page component:**
    Place your new component (e.g., `YourToolPage`) inside a new directory under `apps/web/app/tools/`.
2.  **Register the tool:**
    Add an entry for your new tool in the `TOOLS` registry located in `apps/web/lib/tools.ts`. This entry defines the tool's name, description, icon, category, and URL path, making it appear in the navigation sidebar.

-----

## Tech Stack

  * **Framework**: Next.js 14 (App Router)
  * **Language**: TypeScript
  * **Styling**: Tailwind CSS
  * **Icons**: Lucide React
  * **Monorepo**: Turborepo + pnpm workspaces

-----

## Available Tools

### Implemented

  * **API Tester** - A utility for testing HTTP endpoints, serving as a lightweight alternative to larger clients.
      * Supports all HTTP methods.
      * Allows custom headers and request body.
      * Includes response time tracking and pretty-printed JSON output.

### Planned Tools

| Category | Planned Tools |
| :--- | :--- |
| **Text & Code** | Format-Aware Diff, Text Escape/Unescape (URL, HTML, JS), Code Minifier/Beautifier, String Case Converter |
| **Data & Encoding** | Base64 Encoder/Decoder, JSON ↔ YAML Converter, Hash/Checksum Generator (MD5, SHA) |
| **Time & IDs** | Epoch Time Converter, UUID Generator (v4, v7) |
| **API & Network** | CORS/Preflight Checker, WebSocket Tester, DNS Lookup |
| **FFmpeg Tools** | Video Clipper & Converter, Subtitle/Watermark Burner, Audio Extractor & Resampler, Video Resize & Scale |

-----

## Development

Use the following commands for development workflows:

  * **Install dependencies**
  * **Start development server**
  * **Type check all packages**
  * **Build for production**
  * **Lint**

-----

## Future Plans

The project is structured for staged growth:

1.  **Phase 1: Core Tools (Current)**: Focus on launching a set of essential, high-performance tools and refining the overall user experience.
2.  **Phase 2: SaaS Features**: Introduce optional user accounts, tool history, favorites, and custom configurations.
3.  **Phase 3: Advanced Features**: Implement advanced services like FFmpeg video processing, collaborative features, and a browser extension.
4.  **Phase 4: Monetization**: Introduce tiered access for advanced features while keeping core text tools free.

-----

## Contributing

We encourage contributions from the developer community:

  * **Implement a New Tool**: Use the generator script and submit a Pull Request (PR).
  * **Bug Fixes**: Resolve existing issues and submit a PR.
  * **Documentation**: Improve guides and examples.

-----

## Why Atomic Dev Tools?

This project was created to solve the persistent problems found in existing developer utility tools.

| Feature | Atomic Dev Tools | Typical Alternatives |
| :--- | :--- | :--- |
| **Load time** | Sub-second | 2-30 seconds |
| **Installation** | None (Browser-based) | Often required |
| **Ads** | None | Frequent |
| **Tracking** | Minimal | Excessive |
| **Mobile Use** | Fully supported | Often poor experience |

-----

## License

This project is licensed under the **MIT License**.

-----

**Made for developers, by developers.**

[Website](https://atomicdevtools.com) • [GitHub](https://github.com) • [Twitter](https://twitter.com)