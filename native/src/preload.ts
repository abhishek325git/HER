import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // We can expose native DB methods here if we decide to use IPC-based DB access
  // For now, the Demo uses WASM, and Native mode could also inject a "nativeDb" object
});
