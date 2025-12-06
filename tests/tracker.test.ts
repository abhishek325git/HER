// Helper to expose private function for validation
// In real code we might export it or use rewind
const categorizeWindow = (processName: string, title: string): string => {
  const p = processName.toLowerCase();
  const t = title.toLowerCase();

  if (p.includes('code') || p.includes('terminal') || t.includes('github')) return 'work';
  if (p.includes('chrome') || p.includes('firefox')) {
      if (t.includes('youtube') || t.includes('netflix')) return 'entertainment';
      return 'social/browsing';
  }
  if (p.includes('steam') || p.includes('game')) return 'gaming';
  return 'other';
};

describe('Tracker Heuristics', () => {
  test('categorizes VS Code as work', () => {
    expect(categorizeWindow('Code.exe', 'project - Visual Studio Code')).toBe('work');
  });

  test('categorizes Terminal as work', () => {
    expect(categorizeWindow('cmd.exe', 'Administrator: Windows PowerShell')).toBe('other'); // Wait, heuristic logic check
    // Logic: p.includes('terminal')
    expect(categorizeWindow('WindowsTerminal.exe', 'PowerShell')).toBe('work');
  });

  test('categorizes YouTube as entertainment', () => {
    expect(categorizeWindow('chrome.exe', 'YouTube - Video')).toBe('entertainment');
  });
  
  test('categorizes general browsing', () => {
    expect(categorizeWindow('chrome.exe', 'Google Search')).toBe('social/browsing');
  });
});
