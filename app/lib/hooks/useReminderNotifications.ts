import { useEffect, useRef } from 'react';
import { db } from '../db/wasm-db';

const AGENT_URL = 'http://localhost:3001';

// Check for due reminders every minute and trigger notifications
export function useReminderNotifications() {
  const hasRequestedPermission = useRef(false);

  useEffect(() => {
    // Request notification permission on mount
    if (!hasRequestedPermission.current && 'Notification' in window) {
      hasRequestedPermission.current = true;
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    const checkReminders = async () => {
      await db.init();
      const reminders = await db.getPendingReminders();
      const now = Date.now();

      for (const reminder of reminders) {
        if (reminder.due_date <= now) {
          // Trigger browser notification
          triggerNotification(reminder.title, reminder.message || 'Time for your reminder!');
          
          // Also trigger agent notifications (Windows + Email)
          await triggerAgentNotifications(reminder);
          
          // Mark as completed in browser DB
          await db.completeReminder(reminder.id);
          
          // Also mark as completed in agent DB
          try {
            await fetch(`${AGENT_URL}/api/reminders/${reminder.id}/complete`, { method: 'POST' });
          } catch (e) {
            // Agent not available - reminder will be completed locally
          }
        }
      }
    };

    // Check immediately on mount
    checkReminders();

    // Then check every 30 seconds
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, []);
}

// Trigger agent to send Windows + Email notifications
async function triggerAgentNotifications(reminder: { id: number; title: string; message?: string; due_date: number }) {
  try {
    // Call agent API to trigger notifications for this reminder
    await fetch(`${AGENT_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reminder.title,
        due_date: reminder.due_date
      })
    });
    console.log('[Reminder] Agent notified for:', reminder.title);
  } catch (e) {
    console.log('[Reminder] Agent not available for notifications');
  }
}

function triggerNotification(title: string, _body: string) {
  // Browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🔔 HER Reminder', {
      body: title,
      icon: '/favicon.ico',
      tag: `reminder-${Date.now()}`,
    });
  }

  // Console log for debugging
  console.log('[Reminder] Due now:', title);
}

export default useReminderNotifications;
