// JSON file-based storage for Agent
// No native compilation required!

import path from 'path';
import fs from 'fs';

interface UsageEntry {
  id: number;
  process_name: string;
  window_title: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  category: string;
}

interface Reminder {
  id: number;
  title: string;
  message: string;
  due_date: number;
  is_completed: boolean;
  repeat_rule?: string;
}

interface DbData {
  usage: UsageEntry[];
  memories: any[];
  reminders: Reminder[];
  nextId: number;
}

const DB_FILE = path.join(process.cwd(), 'her-tracking-data.json');

export class NativeDb {
  private data: DbData;

  constructor() {
    this.data = this.load();
    console.log("[NativeDb] Initialized with", this.data.usage.length, "usage entries,", this.data.reminders?.length || 0, "reminders");
  }

  private load(): DbData {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(content);
        // Ensure reminders array exists (backward compatibility)
        if (!data.reminders) {
          data.reminders = [];
        }
        return data;
      }
    } catch (e) {
      console.error("[NativeDb] Failed to load, starting fresh:", e);
    }
    return { usage: [], memories: [], reminders: [], nextId: 1 };
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error("[NativeDb] Failed to save:", e);
    }
  }

  logUsage(processName: string, windowTitle: string, startTime: number, duration: number, category: string) {
    const entry: UsageEntry = {
      id: this.data.nextId++,
      process_name: processName,
      window_title: windowTitle,
      start_time: startTime,
      end_time: Date.now(),
      duration_seconds: duration,
      category: category
    };
    this.data.usage.push(entry);
    this.save();
  }

  getUsageStats(days: number = 7): UsageEntry[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.data.usage
      .filter(u => u.start_time > cutoff)
      .sort((a, b) => b.start_time - a.start_time);
  }

  // --- Reminder Methods ---

  createReminder(title: string, message: string, dueDate: number, repeatRule?: string): number {
    const reminder: Reminder = {
      id: this.data.nextId++,
      title,
      message,
      due_date: dueDate,
      is_completed: false,
      repeat_rule: repeatRule
    };
    this.data.reminders.push(reminder);
    this.save();
    console.log("[NativeDb] Created reminder:", reminder.id, title);
    return reminder.id;
  }

  getPendingReminders(): Reminder[] {
    return this.data.reminders.filter(r => !r.is_completed);
  }

  getDueReminders(): Reminder[] {
    const now = Date.now();
    return this.data.reminders.filter(r => !r.is_completed && r.due_date <= now);
  }

  completeReminder(id: number): void {
    const reminder = this.data.reminders.find(r => r.id === id);
    if (reminder) {
      reminder.is_completed = true;
      this.save();
      console.log("[NativeDb] Completed reminder:", id);
    }
  }

  // For debugging
  getAllUsage(): UsageEntry[] {
    return this.data.usage;
  }

  getAllReminders(): Reminder[] {
    return this.data.reminders;
  }
}

export const db = new NativeDb();
