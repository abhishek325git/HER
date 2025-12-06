import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationChannels {
  browser: boolean;
  windows: boolean;
  email: boolean;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  user: string;
  password: string;
  recipient: string;
}

interface SettingsState {
  groqApiKey: string | null;
  setGroqApiKey: (key: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  // Notification settings
  notificationChannels: NotificationChannels;
  setNotificationChannel: (channel: keyof NotificationChannels, enabled: boolean) => void;
  emailConfig: EmailConfig;
  setEmailConfig: (config: Partial<EmailConfig>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      groqApiKey: null,
      setGroqApiKey: (key) => set({ groqApiKey: key }),
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      // Notification settings
      notificationChannels: {
        browser: true,
        windows: true,
        email: false,
      },
      setNotificationChannel: (channel, enabled) => 
        set((state) => ({
          notificationChannels: { ...state.notificationChannels, [channel]: enabled }
        })),
      
      emailConfig: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        user: '',
        password: '',
        recipient: '',
      },
      setEmailConfig: (config) =>
        set((state) => ({
          emailConfig: { ...state.emailConfig, ...config }
        })),
    }),
    {
      name: 'her-settings',
    }
  )
);
