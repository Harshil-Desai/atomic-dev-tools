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

### API & Network

| Tool | Description |
| :--- | :--- |
| **API Tester** | Test HTTP endpoints with custom headers, body, and all HTTP methods |
| **JWT Inspector** | Decode and inspect JWT tokens — header, payload, expiry |
| **URL Parser & Builder** | Break down and reconstruct URLs with query parameters |
| **cURL ↔ Fetch Converter** | Convert cURL commands to fetch/Axios and back |
| **CORS Preflight Checker** | Test CORS configuration and check if requests are allowed |

### Data & Encoding

| Tool | Description |
| :--- | :--- |
| **Base64 Encoder/Decoder** | Encode or decode text to/from Base64 |
| **JSON Formatter & Validator** | Pretty-print, minify, and validate JSON with error highlighting |
| **JSON ↔ YAML Converter** | Convert between JSON and YAML formats |
| **CSV ↔ JSON Converter** | Convert CSV to JSON array and back with custom delimiters |
| **Number Base Converter** | Convert integers between decimal, binary, octal, and hex |
| **Hash Generator** | Generate cryptographic hashes (MD5, SHA-1, SHA-256, etc.) |

### Text & Code

| Tool | Description |
| :--- | :--- |
| **Format-Aware Diff** | Compare code with normalized whitespace |
| **Text Escape/Unescape** | Encode or decode text in URL, HTML, JS, and other formats |
| **Code Minifier/Beautifier** | Format or minify code in various languages |
| **String Case Converter** | Convert text between camelCase, snake_case, PascalCase, and more |
| **Regex Tester** | Test regular expressions with live match highlighting |
| **Markdown Previewer** | Write Markdown and see the rendered output side by side |
| **Lorem Ipsum Generator** | Generate placeholder text by words, sentences, or paragraphs |

### Time & IDs

| Tool | Description |
| :--- | :--- |
| **Epoch Time Converter** | Convert between human-readable dates and Unix timestamps |
| **UUID Generator** | Generate UUIDs (v4 random or v7 timestamp-based) |
| **Cron Expression Parser** | Translate cron expressions to plain English with next run times |
| **Timezone Converter** | Convert datetimes between any two IANA timezones |

### Security

| Tool | Description |
| :--- | :--- |
| **Password Generator** | Generate strong passwords with configurable rules and entropy score |
| **HMAC Generator** | Generate HMAC-SHA256/512 signatures for webhook verification |
| **JWT Generator & Signer** | Build and sign JWT tokens with HS256/HS512 for auth testing |

### Backend & Architecture

| Tool | Description |
| :--- | :--- |
| **JSON → Type Struct** | Convert JSON payloads to TypeScript interfaces, Go structs, or Rust structs |
| **Snowflake ID Decoder** | Extract timestamp, worker ID, and sequence from distributed Snowflake IDs |
| **SQL Formatter & Linter** | Pretty-print and normalize SQL queries with basic lint warnings |
| **Port Checker / Ping** | Test TCP connectivity to a host:port from the server |

### Systems & Infrastructure

| Tool | Description |
| :--- | :--- |
| **Systemd Timer Generator** | Convert cron expressions into systemd .timer and .service unit files |
| **Bitwise Calculator** | Visual calculator for bit masking, shifting, and endianness swapping |
| **CIDR / Subnet Calculator** | Calculate IP ranges, netmasks, and broadcast addresses from CIDR notation |
| **Chmod / Permission Calculator** | Visual Unix permission builder converting between octal and symbolic representations |

### FFmpeg

| Tool | Description |
| :--- | :--- |
| **FFmpeg Clipper & Converter** | Generate FFmpeg commands for clipping and converting videos |
| **FFmpeg Subtitle/Watermark Burner** | Generate FFmpeg commands to burn subtitles or watermarks into videos |
| **FFmpeg Audio Extractor** | Generate FFmpeg commands to extract audio tracks from video files |
| **FFmpeg Video Resize & Scale** | Generate FFmpeg commands to resize and scale videos to any resolution |
| **FFmpeg Thumbnail Extractor** | Generate FFmpeg commands to extract frames as images from videos |

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