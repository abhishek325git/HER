export interface Memory {
  id: number;
  key: string;
  type: 'text' | 'json' | 'code';
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AppUsage {
  id: number;
  process_name: string;
  window_title: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  category: string;
}

export interface Reminder {
  id: number;
  title: string;
  message: string;
  due_date: number; // unix timestamp
  is_completed: boolean;
  repeat_rule?: string; // 'daily', 'weekly', etc.
}

export interface IDatabase {
  init(): Promise<void>;
  
  // Memories
  createMemory(key: string, content: string, category?: string, type?: string): Promise<number>;
  searchMemories(query: string): Promise<Memory[]>;
  getMemories(): Promise<Memory[]>;
  deleteMemory(id: number): Promise<void>;
  
  // Chat
  saveMessage(message: ChatMessage): Promise<void>;
  getHistory(limit?: number): Promise<ChatMessage[]>;
  clearHistory(): Promise<void>;

  // Usage
  logUsage(usage: Omit<AppUsage, 'id'>): Promise<void>;
  getUsageStats(days: number): Promise<AppUsage[]>;

  // Reminders
  createReminder(reminder: Omit<Reminder, 'id' | 'is_completed'>): Promise<number>;
  getPendingReminders(): Promise<Reminder[]>;
  completeReminder(id: number): Promise<void>;
}
