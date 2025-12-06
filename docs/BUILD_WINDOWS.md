# Build Instructions (Windows)

To build the native Electron application on Windows, you need to set up the build environment for native modules (`better-sqlite3`, `active-win`).

## Prerequisites

1.  **Node.js**: Install Node.js (v18 or higher).
2.  **Visual Studio Build Tools**:
    -   Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/).
    -   Install "Desktop development with C++" workload.
3.  **Python**: Install Python 3.10 or higher.
4.  **PowerShell**: Ensure you can run scripts (Set-ExecutionPolicy RemoteSigned).

## Build Steps

1.  **Install Dependencies**:
    \`\`\`powershell
    npm install
    # Wait for native modules to compile
    \`\`\`

2.  **Rebuild Native Modules (if needed)**:
    If you encounter errors related to `NODE_MODULE_VERSION`, run:
    \`\`\`powershell
    npm install --save-dev electron-rebuild
    .\node_modules\.bin\electron-rebuild
    \`\`\`

3.  **Build Application**:
    \`\`\`powershell
    npm run build
    \`\`\`
    This will:
    -   Compile TypeScript for App, Native, and Agent.
    -   Package the Electron app using `electron-builder`.
    -   Create an installer in `dist-electron/`.

## Troubleshooting

-   **"gyp ERR!"**: Usually missing Python or C++ Build Tools. Verify installation.
-   **SQLite Errors**: Ensure `better-sqlite3` is rebuilt against the Electron ABI version.
