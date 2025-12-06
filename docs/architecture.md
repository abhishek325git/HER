# Architecture

HER is a hybrid Local-First application.

## High-Level Overview

\`\`\`mermaid
graph TD
    A[React Generic Frontend] -->|Demo Mode| B[WASM SQLite DB]
    A -->|Native Mode| C[Electron Main]
    C -->|IPC| D[Native DB (better-sqlite3)]
    E[Agent Service] -->|Writes| D
    E -->|Polls| F[System Window API]
\`\`\`

## Data Flow

1.  **Tracker**: The Agent Service polls the active window every 5 seconds.
2.  **Storage**: Data is written to local SQLite file (`her-native.sqlite`).
3.  **Display**: Content is served via Electron to the React App. The React App queries the DB (via IPC or direct file read in some configs).

## Modules

-   **Frontend**: React + Vite + Zustand.
-   **Native**: Main Process management.
-   **Agent**: Headless Node.js process for background tasks.
-   **Shared**: Common types.

## Configuration

-   All categorizations happen in `agent/src/tracker.ts`.
-   Future: Move heuristics to a JSON config file.
