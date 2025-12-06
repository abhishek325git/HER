import { Tracker } from './tracker';
import { db } from './db';
import { notifyAllChannels, testEmailConfig, sendWindowsNotification } from './notifier';
import schedule from 'node-schedule';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

console.log('HER Agent Service Starting...');

// 1. Start Express API Server
const app = express();
const PORT = 3001;

app.use(cors()); // Allow web app to fetch
app.use(express.json());

// API: Get usage stats
app.get('/api/usage', (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const stats = db.getUsageStats(days);
  res.json(stats);
});

// API: Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', tracking: true, time: new Date().toISOString() });
});

// API: Get pending reminders
app.get('/api/reminders', (_, res) => {
  const reminders = db.getPendingReminders();
  res.json(reminders);
});

// API: Create reminder (so web app can sync with agent)
app.post('/api/reminders', (req, res) => {
  const { title, message, due_date, repeat_rule } = req.body;
  if (!title || !due_date) {
    return res.status(400).json({ error: 'title and due_date are required' });
  }
  const id = db.createReminder(title, message || 'Reminder', due_date, repeat_rule);
  res.json({ id, success: true });
});

// API: Complete a reminder
app.post('/api/reminders/:id/complete', (req, res) => {
  const id = parseInt(req.params.id);
  db.completeReminder(id);
  res.json({ success: true });
});

// API: Test Windows notification
app.post('/api/test-notification', (_, res) => {
  sendWindowsNotification('Test Notification');
  res.json({ success: true, message: 'Windows notification sent' });
});

// API: Test email configuration
app.post('/api/test-email', async (_, res) => {
  const result = await testEmailConfig();
  res.json(result);
});

// API: Trigger notifications on demand (called by browser when reminder fires)
app.post('/api/notify', async (req, res) => {
  const { title, due_date } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  
  console.log('[Agent] /api/notify called for:', title);
  
  // Create a temporary reminder object for notification
  const reminder = {
    id: 0,
    title,
    message: 'Reminder',
    due_date: due_date || Date.now(),
    is_completed: false
  };
  
  // Send through all channels (Windows + Email)
  await notifyAllChannels(reminder);
  
  res.json({ success: true, message: 'Notifications sent' });
});

// API: Get/Update notification config
// Try multiple paths for config file (agent may run from different directories)
const CONFIG_PATHS = [
  path.join(process.cwd(), 'notification-config.json'),
  path.join(process.cwd(), '..', 'notification-config.json'),
  path.join(__dirname, '..', '..', 'notification-config.json'),
];

function findConfigPath(): string | null {
  for (const configPath of CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      console.log('[Agent] Config found at:', configPath);
      return configPath;
    }
  }
  return null;
}

// Default write path is the first one (project root from npm run start-agent)
function getWriteConfigPath(): string {
  return findConfigPath() || CONFIG_PATHS[0];
}

app.get('/api/notification-config', (_, res) => {
  try {
    const configPath = findConfigPath();
    if (configPath) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // Mask password for security
      if (config.email?.password) {
        config.email.password = config.email.password ? '********' : '';
      }
      res.json(config);
    } else {
      res.json({
        channels: { browser: true, windows: true, email: false },
        email: { smtpHost: 'smtp.gmail.com', smtpPort: 587, user: '', password: '', recipient: '' }
      });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

app.post('/api/notification-config', (req, res) => {
  try {
    const newConfig = req.body;
    const configPath = getWriteConfigPath();
    
    // If password is masked, keep the old password
    if (newConfig.email?.password === '********') {
      const existingPath = findConfigPath();
      const oldConfig = existingPath 
        ? JSON.parse(fs.readFileSync(existingPath, 'utf-8')) 
        : {};
      newConfig.email.password = oldConfig.email?.password || '';
    }
    
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    console.log('[Agent] Notification config updated at:', configPath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.listen(PORT, () => {
  console.log(`[Agent API] Running on http://localhost:${PORT}`);
});

// 2. Start Tracker
const tracker = new Tracker();
tracker.start();

// 3. Check for due reminders every 30 seconds
async function checkAndNotifyReminders() {
  const dueReminders = db.getDueReminders();
  
  if (dueReminders.length > 0) {
    console.log(`[Agent] Found ${dueReminders.length} due reminder(s)`);
    
    for (const reminder of dueReminders) {
      console.log(`[Agent] Processing reminder: ${reminder.title}`);
      
      // Send notifications through all channels
      await notifyAllChannels(reminder);
      
      // Mark as completed
      db.completeReminder(reminder.id);
    }
  }
}

// Check immediately on start
checkAndNotifyReminders();

// Then check every 30 seconds
setInterval(checkAndNotifyReminders, 30000);

// Also use node-schedule for more precise timing (every minute)
schedule.scheduleJob('*/1 * * * *', function() {
  console.log('[Agent] Scheduled reminder check...');
  checkAndNotifyReminders();
});

console.log('[Agent] Reminder notification service active (checking every 30s)');

// Keep process alive
process.stdin.resume();
