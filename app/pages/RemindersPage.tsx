import { useEffect, useState } from 'react';
import { db } from '../lib/db/wasm-db';
import { Reminder } from '../../shared/types/db';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Bell, Check, Trash, Clock, Calendar } from 'lucide-react';

const AGENT_URL = 'http://localhost:3001';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const loadReminders = async () => {
    await db.init();
    const items = await db.getPendingReminders();
    // Sort by due date (soonest first)
    items.sort((a, b) => a.due_date - b.due_date);
    setReminders(items);
  };

  useEffect(() => {
    loadReminders();
    // Refresh every 30 seconds to show updated times
    const interval = setInterval(loadReminders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = async () => {
    if (!title || !date) return;
    
    const dueDate = new Date(date).getTime();
    const message = 'Manual reminder';
    
    // Save to local WASM DB (for browser)
    await db.createReminder({
      title,
      message,
      due_date: dueDate,
    });
    
    // Also sync to agent service (for Windows/email notifications)
    try {
      await fetch(`${AGENT_URL}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, due_date: dueDate })
      });
      console.log('[Reminders] Synced to agent');
    } catch (e) {
      console.log('[Reminders] Agent not available, reminder saved locally only');
    }
    
    setTitle('');
    setDate('');
    loadReminders();
  };

  const handleComplete = async (id: number) => {
    await db.completeReminder(id);
    
    // Also sync to agent
    try {
      await fetch(`${AGENT_URL}/api/reminders/${id}/complete`, { method: 'POST' });
    } catch (e) {
      // Agent not available
    }
    
    loadReminders();
  };

  const getTimeUntil = (dueDate: number): string => {
    const now = Date.now();
    const diff = dueDate - now;
    
    if (diff <= 0) return 'Due now!';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    return `in ${minutes}m`;
  };

  const isOverdue = (dueDate: number): boolean => dueDate <= Date.now();

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set reminders here or via chat: "remind me to X at 5pm"
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{reminders.length} pending</span>
      </div>

      {/* Add Reminder Form */}
      <div className="flex gap-4 mb-8 bg-card p-4 rounded-lg border border-border">
        <Input 
          placeholder="What do you want to be reminded about?" 
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div className="flex items-center gap-2 bg-background border border-input rounded-md px-3">
          <Calendar size={16} className="text-muted-foreground" />
          <input 
            type="datetime-local" 
            className="bg-transparent py-2 text-sm outline-none"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
          />
        </div>
        <Button onClick={handleAdd} disabled={!title || !date}>
          <Bell size={16} className="mr-2" />
          Add Reminder
        </Button>
      </div>

      {/* Reminders List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {reminders.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p>No pending reminders.</p>
            <p className="text-sm mt-2">Create one above or say "remind me to..." in chat!</p>
          </div>
        )}
        {reminders.map((r) => (
          <div 
            key={r.id} 
            className={`flex items-center justify-between p-4 rounded-lg border ${
              isOverdue(r.due_date) 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-card border-border'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-full ${
                isOverdue(r.due_date) ? 'bg-red-500/20' : 'bg-primary/10'
              }`}>
                <Bell size={18} className={isOverdue(r.due_date) ? 'text-red-500' : 'text-primary'} />
              </div>
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>{new Date(r.due_date).toLocaleString()}</span>
                  <span className={`font-medium ${
                    isOverdue(r.due_date) ? 'text-red-500' : 'text-primary'
                  }`}>
                    ({getTimeUntil(r.due_date)})
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleComplete(r.id)}
                title="Mark as done"
              >
                <Check size={18} className="text-green-500" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleComplete(r.id)}
                title="Delete"
              >
                <Trash size={18} className="text-muted-foreground hover:text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
