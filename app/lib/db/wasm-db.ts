import initSqlJs, { Database } from 'sql.js';
import { IDatabase, Memory, ChatMessage, AppUsage, Reminder } from '../../../shared/types/db';
// Import the WASM file directly - Vite handles this correctly
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const DB_NAME = 'HER_DB';
const STORE_NAME = 'sqlite_dump';
const KEY = 'latest';

export class WasmDbAdapter implements IDatabase {
  private db: Database | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl
      });
      
      // Load existing DB from IndexedDB
      const savedBits = await this._loadFromIdb();
      
      if (savedBits) {
        this.db = new SQL.Database(savedBits);
      } else {
        this.db = new SQL.Database();
        this._initTables();
      }
      
      this.isInitialized = true;
      await this._autoSave();
    } catch (err) {
      console.error("Failed to init WASM DB", err);
    }
  }

  private _initTables() {
    if (!this.db) return;
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT,
        type TEXT DEFAULT 'text',
        content TEXT,
        category TEXT DEFAULT 'general',
        created_at TEXT,
        updated_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        role TEXT,
        content TEXT,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS app_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        process_name TEXT,
        window_title TEXT,
        start_time INTEGER,
        end_time INTEGER,
        duration_seconds INTEGER,
        category TEXT
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        message TEXT,
        due_date INTEGER,
        is_completed BOOLEAN DEFAULT 0,
        repeat_rule TEXT
      );
    `);
  }

  // --- IndexedDB Helpers ---

  private _openIdb(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, 1);
          req.onupgradeneeded = (e: any) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains(STORE_NAME)) {
                  db.createObjectStore(STORE_NAME);
              }
          };
          req.onsuccess = (e: any) => resolve(e.target.result);
          req.onerror = (e) => reject(e);
      });
  }

  private async _loadFromIdb(): Promise<Uint8Array | null> {
      try {
          const db = await this._openIdb();
          return new Promise((resolve, reject) => {
             const tx = db.transaction(STORE_NAME, 'readonly');
             const store = tx.objectStore(STORE_NAME);
             const req = store.get(KEY);
             req.onsuccess = () => resolve(req.result || null);
             req.onerror = () => reject(req.error);
          });
      } catch (e) {
          console.error("IDB Load Error", e);
          return null;
      }
  }

  private async _saveToIdb(data: Uint8Array): Promise<void> {
      try {
          const db = await this._openIdb();
          return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const req = store.put(data, KEY);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
          });
      } catch (e) {
          console.error("IDB Save Error", e);
      }
  }

  private async _autoSave() {
    if (!this.db) return;
    try {
        const data = this.db.export();
        await this._saveToIdb(data);
    } catch (e) {
        console.warn("Failed to auto-save DB", e);
    }
  }

  // --- Memories ---

  async createMemory(key: string, content: string, category = 'general', type = 'text'): Promise<number> {
    if (!this.db) throw new Error("DB not initialized");
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO memories (key, type, content, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [key, type, content, category, now, now]
    );
    await this._autoSave();
    // Return last ID
    const res = this.db.exec("SELECT last_insert_rowid()");
    return res[0].values[0][0] as number;
  }

  async searchMemories(query: string): Promise<Memory[]> {
    if (!this.db) return [];
    const stmt = this.db.prepare("SELECT * FROM memories WHERE content LIKE ? OR key LIKE ?");
    const wildcard = `%${query}%`;
    stmt.bind([wildcard, wildcard]);
    const results: Memory[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as Memory);
    }
    stmt.free();
    return results;
  }

  async getMemories(): Promise<Memory[]> {
    if (!this.db) return [];
    const res = this.db.exec("SELECT * FROM memories ORDER BY created_at DESC");
    if (res.length === 0) return [];
    
    // Transform columns to objects
    const columns = res[0].columns;
    return res[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj as Memory;
    });
  }

  async deleteMemory(id: number): Promise<void> {
    if (!this.db) return;
    this.db.run("DELETE FROM memories WHERE id = ?", [id]);
    await this._autoSave();
  }

  // --- Chat ---

  async saveMessage(message: ChatMessage): Promise<void> {
    if (!this.db) return;
    this.db.run(
      "INSERT INTO chat_history (id, role, content, timestamp) VALUES (?, ?, ?, ?)",
      [message.id, message.role, message.content, message.timestamp]
    );
    await this._autoSave();
  }

  async getHistory(limit = 50): Promise<ChatMessage[]> {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT * FROM chat_history ORDER BY timestamp ASC LIMIT ${limit}`);
    if (res.length === 0) return [];
    const columns = res[0].columns;
    return res[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj as ChatMessage;
    });
  }

  async clearHistory(): Promise<void> {
     if (!this.db) return;
     this.db.run("DELETE FROM chat_history");
     await this._autoSave();
  }

  // --- Usage ---

  async logUsage(usage: Omit<AppUsage, 'id'>): Promise<void> {
    if (!this.db) return;
    this.db.run(
      "INSERT INTO app_usage (process_name, window_title, start_time, end_time, duration_seconds, category) VALUES (?, ?, ?, ?, ?, ?)",
      [usage.process_name, usage.window_title, usage.start_time, usage.end_time, usage.duration_seconds, usage.category]
    );
    await this._autoSave();
  }

  async getUsageStats(_days: number): Promise<AppUsage[]> {
    if (!this.db) return [];
    // Just dump all for now, filtering can happen in JS for demo
    const res = this.db.exec("SELECT * FROM app_usage");
    if (res.length === 0) return [];
    const columns = res[0].columns;
    return res[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj as AppUsage;
    });
  }

  // --- Reminders ---

  async createReminder(reminder: Omit<Reminder, 'id' | 'is_completed'>): Promise<number> {
    if (!this.db) {
      console.error("[WasmDB] createReminder failed - db not initialized");
      return 0;
    }
    console.log("[WasmDB] Creating reminder:", reminder);
    this.db.run(
      "INSERT INTO reminders (title, message, due_date, is_completed, repeat_rule) VALUES (?, ?, ?, 0, ?)",
      [reminder.title, reminder.message, reminder.due_date, reminder.repeat_rule || null]
    );
    await this._autoSave();
    const res = this.db.exec("SELECT last_insert_rowid()");
    const id = res[0]?.values[0]?.[0] as number || 0;
    console.log("[WasmDB] Created reminder with ID:", id);
    return id;
  }

  async getPendingReminders(): Promise<Reminder[]> {
     if (!this.db) {
       console.warn("[WasmDB] getPendingReminders called but db not initialized");
       return [];
     }
    const res = this.db.exec("SELECT * FROM reminders WHERE is_completed = 0");
    console.log("[WasmDB] getPendingReminders raw result:", res);
    if (res.length === 0) return [];
    const columns = res[0].columns;
    const reminders = res[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj as Reminder;
    });
    console.log("[WasmDB] Returning", reminders.length, "pending reminders");
    return reminders;
  }

  async completeReminder(id: number): Promise<void> {
    if (!this.db) return;
    this.db.run("UPDATE reminders SET is_completed = 1 WHERE id = ?", [id]);
    await this._autoSave();
  }
}

export const db = new WasmDbAdapter();
