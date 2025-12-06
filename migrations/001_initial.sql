-- Initial Migration
CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT,
    type TEXT DEFAULT 'text',
    content TEXT,
    category TEXT DEFAULT 'general',
    created_at TEXT,
    updated_at TEXT
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
