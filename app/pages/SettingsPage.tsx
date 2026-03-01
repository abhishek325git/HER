import { useState, useEffect } from 'react';
import { useSettingsStore } from '../lib/store/settings-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Zap, Check, AlertCircle, Loader2, Bell, Mail, Monitor, Globe } from 'lucide-react';
import Groq from 'groq-sdk';

const AGENT_URL = 'http://localhost:3001';

export default function SettingsPage() {
  const { 
    groqApiKey, 
    setGroqApiKey,
    notificationChannels,
    setNotificationChannel,
    emailConfig,
    setEmailConfig
  } = useSettingsStore();
  
  const [key, setKey] = useState(groqApiKey || '');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  
  // Email form state
  const [emailForm, setEmailForm] = useState(emailConfig);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [windowsTestStatus, setWindowsTestStatus] = useState<'idle' | 'sent'>('idle');

  // Keep emailForm in sync with emailConfig from store
  useEffect(() => {
    setEmailForm(emailConfig);
  }, [emailConfig]);

  // Sync with agent on mount - only sync channels, not email (to preserve local settings)
  useEffect(() => {
    syncConfigWithAgent();
  }, []);

  const syncConfigWithAgent = async () => {
    try {
      const response = await fetch(`${AGENT_URL}/api/notification-config`);
      if (response.ok) {
        const config = await response.json();
        // Only sync notification channels from agent
        if (config.channels) {
          Object.keys(config.channels).forEach((channel) => {
            setNotificationChannel(channel as any, config.channels[channel]);
          });
        }
        // Don't overwrite local email config - Zustand store has persistence
      }
    } catch (e) {
      console.log('[Settings] Agent not available, using local config');
    }
  };

  const saveConfigToAgent = async (configOverride?: { email?: typeof emailForm }) => {
    try {
      await fetch(`${AGENT_URL}/api/notification-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: notificationChannels,
          email: configOverride?.email || emailForm
        })
      });
      console.log('[Settings] Config synced to agent');
    } catch (e) {
      console.log('[Settings] Failed to sync to agent');
    }
  };

  const handleTestAndSave = async () => {
    setStatus('testing');
    setGroqApiKey(key);
    
    try {
      const groq = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        model: "llama-3.3-70b-versatile",
      });

      if (completion.choices[0]?.message?.content) {
        setStatus('success');
        setStatusMsg("Connected! Model: llama-3.3-70b-versatile");
      }
    } catch (e: any) {
      setStatus('error');
      console.error(e);
      setStatusMsg(e.message || "Failed to connect to Groq.");
    }
  };

  const handleChannelToggle = async (channel: 'browser' | 'windows' | 'email') => {
    const newValue = !notificationChannels[channel];
    setNotificationChannel(channel, newValue);
    
    // Sync to agent
    setTimeout(saveConfigToAgent, 100);
  };

  const handleEmailSave = async () => {
    // Update local store first
    setEmailConfig(emailForm);
    // Pass the current emailForm directly to avoid stale state
    await saveConfigToAgent({ email: emailForm });
    setEmailStatus('success');
    setEmailStatusMsg('Email settings saved!');
    setTimeout(() => setEmailStatus('idle'), 3000);
  };

  const handleTestEmail = async () => {
    setEmailStatus('testing');
    
    // First save the config - pass directly to avoid stale state
    setEmailConfig(emailForm);
    await saveConfigToAgent({ email: emailForm });
    
    try {
      const response = await fetch(`${AGENT_URL}/api/test-email`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        setEmailStatus('success');
        setEmailStatusMsg('Email configuration is valid!');
      } else {
        setEmailStatus('error');
        setEmailStatusMsg(result.message || 'Failed to verify email');
      }
    } catch (e) {
      setEmailStatus('error');
      setEmailStatusMsg('Agent not running. Start the agent service to test email.');
    }
  };

  const handleTestWindows = async () => {
    try {
      await fetch(`${AGENT_URL}/api/test-notification`, { method: 'POST' });
      setWindowsTestStatus('sent');
      setTimeout(() => setWindowsTestStatus('idle'), 3000);
    } catch (e) {
      alert('Agent not running. Start the agent service to test Windows notifications.');
    }
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Zap className="text-orange-500" />
        Settings
      </h1>

      {/* AI Engine Configuration */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">AI Engine Configuration</h2>
        <p className="text-muted-foreground text-sm mb-6">
          HER is powered by **Groq**, providing blazing fast responses using Llama 3.
          Get a free API key from the dashboard.
        </p>
        
        <div className="flex gap-2">
          <Input 
            type="password" 
            placeholder="gsk_..."
            value={key}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setKey(e.target.value);
              setStatus('idle');
            }}
            className="flex-1"
          />
          <Button onClick={handleTestAndSave} disabled={!key || status === 'testing'}>
            {status === 'testing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {status === 'success' ? <Check className="h-4 w-4 mr-2" /> : null}
            {status === 'testing' ? 'Testing...' : 'Save & Test'}
          </Button>
        </div>
        
        {status === 'error' && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="overflow-auto max-h-32">
              <p className="font-semibold">Connection Failed:</p>
              <p>{statusMsg}</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-4 p-3 bg-green-500/10 text-green-600 rounded-md text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            <p>{statusMsg}</p>
          </div>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground">
          Need a key? <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">Get one here (Free)</a>.
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Configure how you want to receive reminder notifications.
        </p>

        {/* Channel Toggles */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Browser Notifications</p>
                <p className="text-xs text-muted-foreground">Shows notifications in browser (requires tab open)</p>
              </div>
            </div>
            <button
              onClick={() => handleChannelToggle('browser')}
              className={`w-12 h-6 rounded-full transition-colors ${
                notificationChannels.browser ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                notificationChannels.browser ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Windows Notifications</p>
                <p className="text-xs text-muted-foreground">Native Windows toast notifications (requires agent)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestWindows}
                className="text-xs"
              >
                {windowsTestStatus === 'sent' ? <Check className="h-3 w-3 mr-1" /> : null}
                Test
              </Button>
              <button
                onClick={() => handleChannelToggle('windows')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notificationChannels.windows ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notificationChannels.windows ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Sends email reminders (configure below)</p>
              </div>
            </div>
            <button
              onClick={() => handleChannelToggle('email')}
              className={`w-12 h-6 rounded-full transition-colors ${
                notificationChannels.email ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                notificationChannels.email ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Email Configuration */}
        {notificationChannels.email && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Configuration
            </h3>
            
            {/* Hardcoded SMTP Settings (Hidden from UI) */}
            <div className="space-y-4">
              <div className="hidden">
                <Input value={emailForm.smtpHost} readOnly />
                <Input value={emailForm.smtpPort} readOnly />
                <Input value={emailForm.user} readOnly />
                <Input value={emailForm.password} readOnly />
              </div>
              
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground mb-4">
                <p>Email services are configured via <strong>smtp.gmail.com</strong>.</p>
                <p>Sending from: <strong>abhisheksworkuk@gmail.com</strong></p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Send Reminders To</label>
                <Input
                  type="email"
                  placeholder="your-email@gmail.com"
                  value={emailForm.recipient}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEmailForm({ 
                      ...emailForm, 
                      recipient: e.target.value,
                      // Ensure hardcoded values are always preserved
                      smtpHost: 'smtp.gmail.com',
                      smtpPort: 587,
                      user: 'abhisheksworkuk@gmail.com',
                      password: 'noab ulkg doht treo'
                    })
                  }
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleEmailSave} className="flex-1">
                  Save Email Settings
                </Button>
                <Button variant="outline" onClick={handleTestEmail} disabled={emailStatus === 'testing'}>
                  {emailStatus === 'testing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Test Connection
                </Button>
              </div>
              
              {emailStatus === 'error' && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{emailStatusMsg}</p>
                </div>
              )}
              
              {emailStatus === 'success' && (
                <div className="p-3 bg-green-500/10 text-green-600 rounded-md text-sm flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <p>{emailStatusMsg}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
