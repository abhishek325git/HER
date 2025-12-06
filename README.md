# HER - Personal AI Assistant

A local-first, privacy-focused personal AI assistant for Windows.

## Modes

1.  **Demo Mode**: Runs entirely in the browser using `sql.js` (WASM) and simulated data. No native installation required.
2.  **Native Mode**: Electron application with full system access, window tracking, and persistent SQLite database.

## Prerequisites

- Node.js (v18+)
- (For Native Mode) Visual Studio Build Tools & Python (for `better-sqlite3` and `active-win` compilation)

## Quick Start (Demo Mode)

1.  Install dependencies:
    \`\`\`bash
    npm install
    \`\`\`
2.  Run the demo:
    \`\`\`bash
    npm run dev:demo
    \`\`\`
3.  Open http://localhost:5173

## Native Mode (Windows)

See [BUILD_WINDOWS.md](docs/BUILD_WINDOWS.md) for detailed build instructions.

1.  Install build tools.
2.  Build and run:
    \`\`\`bash
    npm run dev:native
    \`\`\`

## Features

- **Chat**: Local AI chat interface.
- **Memory**: Searchable conversation history and notes.
- **Dashboard**: Usage statistics and charts.
- **Agent**: (Native only) Tracks active window usage.
- **Reminders**: Local notifications and email fallback.

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/SECURITY.md)

## License

MIT
