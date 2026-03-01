// PowerShell-based window tracker for Windows
// Uses external script file to avoid escaping issues

import { exec } from 'child_process';
import path from 'path';
import { db } from './db';

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'get-active-window.ps1');

interface WindowInfo {
  Title: string;
  Process: string;
}

function getActiveWindow(): Promise<WindowInfo | null> {
  return new Promise((resolve) => {
    exec(`powershell -ExecutionPolicy Bypass -File "${SCRIPT_PATH}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("[Tracker] PowerShell error:", error.message);
        resolve(null);
        return;
      }
      if (stderr) {
        console.error("[Tracker] PowerShell stderr:", stderr);
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        console.error("[Tracker] Failed to parse:", stdout);
        resolve(null);
      }
    });
  });
}

function categorizeWindow(processName: string, title: string): string {
  const p = (processName || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (p.includes('code') || p.includes('devenv') || t.includes('github') || p.includes('powershell') || p.includes('windowsterminal')) return 'work';
  
  // Debug logging
  console.log(`[Tracker] Categorizing: Process='${p}', Title='${t}'`);

  if (p.includes('chrome') || p.includes('firefox') || p.includes('edge') || p.includes('msedge') || p.includes('brave')) {
      if (t.includes('youtube') || t.includes('netflix') || t.includes('twitch')) return 'entertainment';
      if (t.includes('twitter') || t.includes('facebook') || t.includes('instagram')) return 'social';
      return 'browsing';
  }
  
  // Gaming - added more checks
  if (p.includes('steam') || p.includes('game') || p.includes('minecraft') || p.includes('cyberpunk') || t.includes('cyberpunk') || p.includes('redlauncher') || p.includes('cd projekt')) return 'gaming';
  
  if (p.includes('spotify') || p.includes('vlc') || p.includes('music')) return 'entertainment';
  if (p.includes('slack') || p.includes('discord') || p.includes('teams')) return 'communication';
  return 'other';
}

export class Tracker {
  private isTracking = false;
  private lastWindow: WindowInfo | null = null;
  private lastCheckTime: number = Date.now();

  async start(intervalMs = 5000) {
    if (this.isTracking) return;
    this.isTracking = true;
    console.log(`[Tracker] Started (polling every ${intervalMs}ms)`);
    
    // Initialize lastPollTime
    let lastPollTime = Date.now();

    setInterval(async () => {
      try {
        const windowInfo = await getActiveWindow();
        const now = Date.now();
        
        // Check for sleep/suspend (gap > 3x interval)
        const timeSinceLastPoll = now - lastPollTime;
        if (timeSinceLastPoll > intervalMs * 3) {
            console.log(`[Tracker] Sleep/Suspend detected (gap: ${Math.round(timeSinceLastPoll/1000)}s)`);
            
            // Log the pending session up to the point of sleep
            if (this.lastWindow) {
                const durationBeforeSleep = Math.floor((lastPollTime - this.lastCheckTime) / 1000);
                if (durationBeforeSleep > 1) {
                    const category = categorizeWindow(this.lastWindow.Process, this.lastWindow.Title);
                    db.logUsage(
                        this.lastWindow.Process, 
                        this.lastWindow.Title, 
                        this.lastCheckTime, 
                        durationBeforeSleep, 
                        category
                    );
                    console.log(`[Tracker] Logged (Pre-Sleep): ${this.lastWindow.Process} - ${durationBeforeSleep}s`);
                }
            }
            // Reset timer for new session after sleep
            this.lastCheckTime = now;
        }
        lastPollTime = now;

        if (windowInfo && windowInfo.Process) {
            // Check if window changed
            if (this.lastWindow && 
                (this.lastWindow.Process !== windowInfo.Process || 
                 this.lastWindow.Title !== windowInfo.Title)) {
                
                // Log the PREVIOUS session
                const duration = Math.floor((now - this.lastCheckTime) / 1000);
                if (duration > 1) { // Ignore < 1s
                    const category = categorizeWindow(this.lastWindow.Process, this.lastWindow.Title);
                    db.logUsage(
                        this.lastWindow.Process, 
                        this.lastWindow.Title, 
                        this.lastCheckTime, 
                        duration, 
                        category
                    );
                    console.log(`[Tracker] Logged: ${this.lastWindow.Process} - ${duration}s (${category})`);
                }
                this.lastCheckTime = now;
            } else if (!this.lastWindow) {
                // First window detection
                this.lastCheckTime = now;
            }
            
            this.lastWindow = windowInfo;
        }
      } catch (error) {
        console.error("[Tracker] Error:", error);
      }
    }, intervalMs);
  }
}
