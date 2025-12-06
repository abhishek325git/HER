// Notification service for HER Agent
// Handles Windows native notifications and email notifications

import notifier from 'node-notifier';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

interface NotificationConfig {
  channels: {
    browser: boolean;
    windows: boolean;
    email: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    user: string;
    password: string;
    recipient: string;
  };
}

interface Reminder {
  id: number;
  title: string;
  message: string;
  due_date: number;
  is_completed: boolean;
}

// Try multiple paths for config file (agent may run from different directories)
const CONFIG_PATHS = [
  path.join(process.cwd(), 'notification-config.json'),
  path.join(process.cwd(), '..', 'notification-config.json'),
  path.join(__dirname, '..', '..', '..', 'notification-config.json'),
];

// Load configuration
function loadConfig(): NotificationConfig {
  console.log('[Notifier] Looking for config in:', CONFIG_PATHS);
  
  for (const configPath of CONFIG_PATHS) {
    try {
      if (fs.existsSync(configPath)) {
        console.log('[Notifier] Found config at:', configPath);
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        console.log('[Notifier] Email enabled:', config.channels?.email);
        console.log('[Notifier] Recipient:', config.email?.recipient);
        return config;
      }
    } catch (e) {
      console.error('[Notifier] Failed to load config from', configPath, ':', e);
    }
  }
  
  console.warn('[Notifier] No config file found, using defaults');
  // Default config
  return {
    channels: { browser: true, windows: true, email: false },
    email: { smtpHost: '', smtpPort: 587, user: '', password: '', recipient: '' }
  };
}

// Send Windows native notification
export function sendWindowsNotification(title: string): void {
  const config = loadConfig();
  
  if (!config.channels.windows) {
    console.log('[Notifier] Windows notifications disabled');
    return;
  }

  console.log('[Notifier] Sending Windows notification:', title);
  
  notifier.notify({
    title: '🔔 HER Reminder',
    message: title,
    icon: path.join(process.cwd(), 'assets', 'icon.png'),
    sound: true,
    wait: false,
    appID: 'HER Personal AI'
  }, (err, response) => {
    if (err) {
      console.error('[Notifier] Windows notification error:', err);
    } else {
      console.log('[Notifier] Windows notification sent successfully');
    }
  });
}

// Generate professional email HTML
function generateEmailHTML(title: string, dueDate: number): string {
  const formattedDate = new Date(dueDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🔔</div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Reminder
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background: white; padding: 32px; border-left: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; line-height: 1.4;">
                ${title}
              </h2>
              
              <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="width: 40px; vertical-align: top;">
                      <div style="font-size: 20px;">⏰</div>
                    </td>
                    <td>
                      <div style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                        Scheduled For
                      </div>
                      <div style="color: #18181b; font-size: 15px; font-weight: 500;">
                        ${formattedDate}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0;">
                This is a friendly reminder from your personal AI assistant. Don't forget to complete this task!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #18181b; padding: 24px 32px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #a1a1aa; font-size: 13px; margin: 0 0 8px 0;">
                Sent by <strong style="color: #e4e4e7;">HER</strong> - Your Personal AI Assistant
              </p>
              <p style="color: #71717a; font-size: 11px; margin: 0;">
                Manage your reminders at your HER dashboard
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Send email notification
export async function sendEmailNotification(title: string, dueDate: number): Promise<boolean> {
  const config = loadConfig();
  
  if (!config.channels.email) {
    console.log('[Notifier] Email notifications disabled');
    return false;
  }

  if (!config.email.user || !config.email.password || !config.email.recipient) {
    console.warn('[Notifier] Email not configured properly - missing credentials');
    return false;
  }

  console.log('[Notifier] Attempting to send email to:', config.email.recipient);
  console.log('[Notifier] From:', config.email.user);
  console.log('[Notifier] SMTP:', config.email.smtpHost + ':' + config.email.smtpPort);

  try {
    const transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpPort === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });

    const info = await transporter.sendMail({
      from: `"HER AI Assistant" <${config.email.user}>`,
      to: config.email.recipient,
      subject: `🔔 Reminder: ${title}`,
      text: `Reminder: ${title}\n\nThis is a reminder from HER, your personal AI assistant.`,
      html: generateEmailHTML(title, dueDate),
    });

    console.log('[Notifier] ✅ Email sent successfully!');
    console.log('[Notifier] Message ID:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('[Notifier] ❌ Failed to send email:', error.message);
    console.error('[Notifier] Full error:', error);
    return false;
  }
}

// Send notification through all enabled channels
export async function notifyAllChannels(reminder: Reminder): Promise<void> {
  console.log('[Notifier] ========================================');
  console.log('[Notifier] Processing reminder:', reminder.title);
  console.log('[Notifier] Due date:', new Date(reminder.due_date).toLocaleString());
  console.log('[Notifier] ========================================');

  // Windows notification
  sendWindowsNotification(reminder.title);

  // Email notification
  const emailSent = await sendEmailNotification(reminder.title, reminder.due_date);
  
  if (emailSent) {
    console.log('[Notifier] ✅ All notifications sent for:', reminder.title);
  } else {
    console.log('[Notifier] ⚠️ Windows notification sent, but email may have failed');
  }
}

// Test email configuration
export async function testEmailConfig(): Promise<{ success: boolean; message: string }> {
  const config = loadConfig();
  
  if (!config.email.user || !config.email.password) {
    return { success: false, message: 'Email credentials not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpPort === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });

    await transporter.verify();
    return { success: true, message: 'Email configuration is valid!' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to verify email config' };
  }
}

export default {
  sendWindowsNotification,
  sendEmailNotification,
  notifyAllChannels,
  testEmailConfig,
  loadConfig
};
