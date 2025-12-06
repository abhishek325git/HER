import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'her-native.sqlite');
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

async function migrate() {
  console.log(`Migrating DB at ${DB_PATH}...`);
  const db = new Database(DB_PATH);
  
  const files = fs.readdirSync(MIGRATIONS_DIR).sort();
  
  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      db.exec(sql);
    }
  }
  
  console.log('Migration complete.');
  db.close();
}

migrate().catch(console.error);
