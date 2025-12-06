import { useEffect, useState } from 'react';
import { UsageLineChart, CategoryDoughnut } from '../components/Charts';
import { db } from '../lib/db/wasm-db';
import { Lightbulb, Clock, Trophy, Zap, TrendingUp } from 'lucide-react';

const AGENT_API = 'http://localhost:3001';

interface UsageEntry {
  id: number;
  process_name: string;
  window_title: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  category: string;
}

interface Stats {
  totalTime: number;
  focusTime: number;
  mostUsedApp: string;
  mostUsedTime: number;
  productivityScore: number;
  categoryBreakdown: Record<string, number>;
  tip: string;
}

// Better categorization based on process name and window title
function categorizeEntry(entry: UsageEntry): string {
  const p = (entry.process_name || '').toLowerCase();
  const t = (entry.window_title || '').toLowerCase();
  
  // System utilities to ignore in stats (but still track)
  if (isSystemUtility(p)) {
    return 'system';
  }
  
  // ALL Browsers = Work (as per user request)
  if (p.includes('chrome') || p.includes('firefox') || p.includes('edge') || 
      p.includes('brave') || p.includes('opera') || p.includes('msedge')) {
    // Only exception: pure entertainment sites
    if (t.includes('youtube') || t.includes('netflix') || t.includes('twitch') ||
        t.includes('prime video') || t.includes('disney+')) {
      return 'entertainment';
    }
    return 'work';
  }
  
  // Developer tools & IDEs = Work
  if (p.includes('code') || p.includes('devenv') || p.includes('idea') || 
      p.includes('eclipse') || p.includes('antigravity') || p.includes('cursor') ||
      p.includes('windowsterminal') || p.includes('powershell') || p.includes('cmd') ||
      p.includes('notepad') || p.includes('sublime') || p.includes('atom')) {
    return 'work';
  }
  
  // Communication/Social
  if (p.includes('whatsapp') || p.includes('telegram') || p.includes('discord') || 
      p.includes('slack') || p.includes('teams') || p.includes('zoom') ||
      t.includes('whatsapp') || t.includes('telegram') || t.includes('discord')) {
    return 'social';
  }
  
  // Entertainment
  if (p.includes('spotify') || p.includes('vlc') || p.includes('netflix') ||
      t.includes('spotify')) {
    return 'entertainment';
  }
  
  // Gaming
  if (p.includes('steam') || p.includes('game') || p.includes('minecraft') ||
      p.includes('epic') || p.includes('riot') || p.includes('valorant') ||
      p.includes('cyberpunk') || t.includes('cyberpunk') || p.includes('redlauncher') ||
      p.includes('cd projekt')) {
    return 'gaming';
  }
  
  return 'other';
}

// System utilities to filter out from "Recent Activity" display
function isSystemUtility(processName: string): boolean {
  const p = processName.toLowerCase();
  const systemApps = [
    'explorer', 'shellexperiencehost', 'searchhost', 'startmenuexperiencehost',
    'idle', 'lockapp', 'snippingtool', 'screensketch', 'textinputhost',
    'applicationframehost', 'dwm', 'taskmgr', 'settings', 'systemsettings',
    'runtimebroker', 'searchui', 'cortana', 'sihost', 'fontdrvhost',
    'wmiprvse', 'csrss', 'winlogon', 'services', 'lsass', 'conhost'
  ];
  return systemApps.some(app => p.includes(app));
}

// Check if an entry is "important" enough to show in Recent Activity
function isImportantActivity(entry: UsageEntry): boolean {
  const p = (entry.process_name || '').toLowerCase();
  
  // Filter out system utilities
  if (isSystemUtility(p)) return false;
  
  // Filter out very short activities (< 10 seconds)
  if (entry.duration_seconds < 10) return false;
  
  // Filter out entries with empty titles (usually system)
  if (!entry.window_title || entry.window_title.trim() === '') return false;
  
  return true;
}

function calculateStats(entries: UsageEntry[]): Stats {
  const categoryTotals: Record<string, number> = {
    work: 0,
    social: 0,
    entertainment: 0,
    gaming: 0,
    browsing: 0,
    system: 0,
    other: 0
  };
  
  const appTotals: Record<string, number> = {};
  let totalSeconds = 0;
  
  entries.forEach(entry => {
    const category = categorizeEntry(entry);
    const duration = entry.duration_seconds;
    
    categoryTotals[category] = (categoryTotals[category] || 0) + duration;
    totalSeconds += duration;
    
    // Track app usage
    const appName = entry.process_name;
    appTotals[appName] = (appTotals[appName] || 0) + duration;
  });
  
  // Find most used app
  let mostUsedApp = 'None';
  let mostUsedTime = 0;
  Object.entries(appTotals).forEach(([app, time]) => {
    if (time > mostUsedTime && app !== 'Idle' && app !== 'ShellExperienceHost') {
      mostUsedApp = app;
      mostUsedTime = time;
    }
  });
  
  // Focus time = work + browsing (work-related)
  const focusTime = categoryTotals.work;
  
  // Productivity score = (work time / total active time) * 100
  const activeTime = totalSeconds - (categoryTotals.system || 0);
  const productivityScore = activeTime > 0 ? Math.round((focusTime / activeTime) * 100) : 0;
  
  // Generate tip based on usage patterns
  let tip = "Keep up the great work! 💪";
  const maxCategory = Object.entries(categoryTotals).reduce((a, b) => a[1] > b[1] ? a : b);
  
  if (maxCategory[0] === 'entertainment' && maxCategory[1] > categoryTotals.work) {
    tip = "🎬 You've spent more time on entertainment than work today. Try the Pomodoro technique!";
  } else if (maxCategory[0] === 'social' && maxCategory[1] > categoryTotals.work) {
    tip = "💬 Social apps are taking up a lot of time. Consider setting specific times for checking messages.";
  } else if (maxCategory[0] === 'gaming') {
    tip = "🎮 Lots of gaming today! Remember to take breaks and stay hydrated.";
  } else if (productivityScore > 60) {
    tip = "🚀 Excellent productivity! You're doing great. Don't forget to take short breaks.";
  } else if (productivityScore > 40) {
    tip = "👍 Good balance today. Try to increase focus time by closing distracting tabs.";
  } else if (productivityScore < 30) {
    tip = "⚡ Low focus time detected. Try working in 25-minute focused sprints!";
  }
  
  return {
    totalTime: totalSeconds,
    focusTime,
    mostUsedApp,
    mostUsedTime,
    productivityScore,
    categoryBreakdown: categoryTotals,
    tip
  };
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function DashboardPage() {
  const [lineData, setLineData] = useState<any>(null);
  const [pieData, setPieData] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [rawEntries, setRawEntries] = useState<UsageEntry[]>([]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds when live
    const interval = setInterval(() => {
      if (isLive) loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [isLive]);

  async function loadData() {
    let entries: UsageEntry[] = [];
    
    // Try to fetch from live Agent API first
    try {
      const res = await fetch(`${AGENT_API}/api/usage?days=7`);
      if (res.ok) {
        entries = await res.json();
        setIsLive(true);
        setLastUpdate(new Date().toLocaleTimeString());
        console.log("[Dashboard] Fetched LIVE data:", entries.length, "entries");
      }
    } catch (e) {
      console.log("[Dashboard] Agent not available, falling back to simulated data");
      setIsLive(false);
    }

    // Fallback: Use WASM DB with seeded data
    if (entries.length === 0) {
      await db.init();
      entries = await db.getUsageStats(30);
      
      if (entries.length === 0) {
        // Seed demo data
        const apps = ['Visual Studio Code', 'Google Chrome', 'Spotify', 'Terminal'];
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          for (let j = 0; j < 5; j++) {
            const app = apps[Math.floor(Math.random() * apps.length)];
            const duration = Math.floor(Math.random() * 3600) + 300;
            await db.logUsage({
              process_name: app,
              window_title: `${app} - Project HER`,
              start_time: date.getTime(),
              end_time: date.getTime() + (duration * 1000),
              duration_seconds: duration,
              category: app === 'Spotify' ? 'entertainment' : 'work'
            });
          }
        }
        entries = await db.getUsageStats(30);
      }
    }
    
    setRawEntries(entries);
    
    // Calculate real stats
    const calculatedStats = calculateStats(entries);
    setStats(calculatedStats);
    
    // Prepare chart data - last 7 days
    const dayLabels: string[] = [];
    const dayData: Record<string, number[]> = {
      work: [],
      entertainment: [],
      social: [],
      gaming: [],
      other: []
    };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dayLabels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      
      // Initialize day totals
      Object.keys(dayData).forEach(k => dayData[k].push(0));
    }
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.start_time);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 7) {
        const idx = 6 - diffDays;
        const category = categorizeEntry(entry);
        const mins = entry.duration_seconds / 60;
        
        if (category === 'work') dayData.work[idx] += mins;
        else if (category === 'entertainment') dayData.entertainment[idx] += mins;
        else if (category === 'gaming') dayData.gaming[idx] += mins;
        else if (category === 'social') dayData.social[idx] += mins;
        else dayData.other[idx] += mins;
      }
    });

    setLineData({
      labels: dayLabels,
      datasets: [
        {
          label: 'Work (mins)',
          data: dayData.work.map(v => Math.round(v)),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0.3
        },
        {
          label: 'Entertainment (mins)',
          data: dayData.entertainment.map(v => Math.round(v)),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          tension: 0.3
        },
        {
          label: 'Social (mins)',
          data: dayData.social.map(v => Math.round(v)),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.3
        },
        {
          label: 'Gaming (mins)',
          data: dayData.gaming.map(v => Math.round(v)),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          tension: 0.3
        },
        {
          label: 'Other (mins)',
          data: dayData.other.map(v => Math.round(v)),
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.5)',
          tension: 0.3
        },
      ],
    });

    // Pie chart data
    const { categoryBreakdown } = calculatedStats;
    setPieData({
      labels: ['Work', 'Entertainment', 'Social', 'Browsing', 'Gaming', 'Other'],
      datasets: [{
        label: 'Minutes',
        data: [
          Math.round((categoryBreakdown.work || 0) / 60),
          Math.round((categoryBreakdown.entertainment || 0) / 60),
          Math.round((categoryBreakdown.social || 0) / 60),
          Math.round((categoryBreakdown.browsing || 0) / 60),
          Math.round((categoryBreakdown.gaming || 0) / 60),
          Math.round(((categoryBreakdown.other || 0) + (categoryBreakdown.system || 0)) / 60),
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(156, 163, 175, 0.7)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(245, 158, 11)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      }],
    });
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          {isLive ? (
            <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded-full flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              LIVE ({rawEntries.length} entries)
            </span>
          ) : (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
              Simulated
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && <span className="text-xs text-muted-foreground">Updated: {lastUpdate}</span>}
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Productivity Tip */}
      {stats && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Lightbulb className="text-primary shrink-0" size={24} />
          <p className="text-sm">{stats.tip}</p>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock size={16} />
            Total Screen Time
          </div>
          <div className="text-2xl font-bold">{stats ? formatTime(stats.totalTime) : '...'}</div>
        </div>
        
        <div className="bg-card p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Zap size={16} />
            Focus Time
          </div>
          <div className="text-2xl font-bold text-green-500">{stats ? formatTime(stats.focusTime) : '...'}</div>
        </div>
        
        <div className="bg-card p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Trophy size={16} />
            Most Used App
          </div>
          <div className="text-xl font-bold truncate">{stats?.mostUsedApp || '...'}</div>
          <div className="text-xs text-muted-foreground">{stats ? formatTime(stats.mostUsedTime) : ''}</div>
        </div>
        
        <div className="bg-card p-5 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingUp size={16} />
            Productivity Score
          </div>
          <div className={`text-2xl font-bold ${
            (stats?.productivityScore || 0) >= 60 ? 'text-green-500' : 
            (stats?.productivityScore || 0) >= 40 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {stats?.productivityScore || 0}%
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-center">Weekly Activity</h3>
          {lineData ? <UsageLineChart data={lineData} /> : <p className="text-center text-muted-foreground">Loading...</p>}
        </div>
        
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
           <h3 className="text-lg font-semibold mb-4 text-center">Category Breakdown</h3>
           <div className="max-w-[300px] mx-auto">
             {pieData ? <CategoryDoughnut data={pieData} /> : <p className="text-center text-muted-foreground">Loading...</p>}
           </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {rawEntries
            .filter(isImportantActivity)
            .sort((a, b) => b.duration_seconds - a.duration_seconds)
            .slice(0, 15)
            .map((entry, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  categorizeEntry(entry) === 'work' ? 'bg-green-500' :
                  categorizeEntry(entry) === 'entertainment' ? 'bg-red-500' :
                  categorizeEntry(entry) === 'social' ? 'bg-blue-500' :
                  categorizeEntry(entry) === 'gaming' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>
                <div>
                  <div className="font-medium text-sm">{entry.process_name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[300px]">{entry.window_title}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatTime(entry.duration_seconds)}</div>
                <div className="text-xs text-muted-foreground capitalize">{categorizeEntry(entry)}</div>
              </div>
            </div>
          ))}
          {rawEntries.filter(isImportantActivity).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No significant activity yet. Use your apps for a while!</p>
          )}
        </div>
      </div>
    </div>
  );
}
