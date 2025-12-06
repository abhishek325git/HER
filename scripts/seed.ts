import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'her-native.sqlite');
const SEED_FILE = path.join(process.cwd(), 'demo-data/app-usage.json');

async function seed() {
  console.log(`Seeding DB at ${DB_PATH}...`);
  const db = new Database(DB_PATH);
  
  if (fs.existsSync(SEED_FILE)) {
    const data = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    
    const stmt = db.prepare(
      "INSERT INTO app_usage (process_name, window_title, start_time, end_time, duration_seconds, category) VALUES (?, ?, ?, ?, ?, ?)"
    );
    
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        stmt.run(row.process_name, row.window_title, row.start_time, row.end_time, row.duration_seconds, row.category);
      }
    });

    insertMany(data);
    console.log(`Seeded ${data.length} rows.`);
  } else {
    console.log('No seed file found.');
  }

  db.close();
}

seed().catch(console.error);
