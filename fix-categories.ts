
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'her-tracking-data.json');

try {
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  const data = JSON.parse(content);
  
  let updatedCount = 0;
  
  if (data.usage && Array.isArray(data.usage)) {
    data.usage.forEach((entry: any) => {
      const p = (entry.process_name || '').toLowerCase();
      const t = (entry.window_title || '').toLowerCase();
      
      if (p.includes('cyberpunk') || t.includes('cyberpunk')) {
        if (entry.category !== 'gaming') {
            console.log(`Fixing entry ${entry.id}: ${entry.process_name} (${entry.category} -> gaming)`);
            entry.category = 'gaming';
            updatedCount++;
        }
      }
    });
  }
  
  if (updatedCount > 0) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    console.log(`Successfully updated ${updatedCount} entries.`);
  } else {
    console.log("No entries needed fixing.");
  }
  
} catch (e) {
  console.error("Error fixing DB:", e);
}
