import { useState } from 'react';
import { useAutomationStore, Action } from '../lib/store/automation-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Play, Trash2, Plus } from 'lucide-react';

export default function AutomationPage() {
  const { actions, addAction, removeAction, runAction } = useAutomationStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newAction, setNewAction] = useState<Partial<Action>>({ type: 'open_url', requiresConfirmation: false });

  const handleCreate = () => {
    if (newAction.name && newAction.payload && newAction.type) {
      addAction(newAction as unknown as Omit<Action, 'id'>);
      setIsAdding(false);
      setNewAction({ type: 'open_url', requiresConfirmation: false });
    }
  };

  /* 
    Actually, runAction is in the store. We should wrap the call here to show feedback.
  */
  const handleRun = (id: string, type: string) => {
    if (type === 'open_app') {
       alert("Running NATIVE apps is blocked in the Web Demo.\n\nOnly 'Open URL' works fully in the browser.");
       return;
    }
    runAction(id);
    // In a real app, show a toast here
  };

  return (
    <div className="p-8 h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold">Automations</h1>
            <p className="text-sm text-muted-foreground mt-1">Create scripts to automate your workflow.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}><Plus size={16} className="mr-2" /> New Action</Button>
      </div>

      {isAdding && (
        <div className="bg-card p-4 rounded-lg border border-border mb-6 animate-in slide-in-from-top-2">
          <h3 className="font-semibold mb-4">Create New Action</h3>
          <div className="grid gap-4">
            <Input 
              placeholder="Action Name" 
              value={newAction.name || ''} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAction({...newAction, name: e.target.value})} 
            />
            <select 
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
              value={newAction.type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAction({...newAction, type: e.target.value as any})}
            >
              <option value="open_url">Open URL</option>
              <option value="open_app">Open Application (Native)</option>
              <option value="play_audio">Play Audio</option>
            </select>
            <Input 
              placeholder="Target (URL or Path)" 
              value={newAction.payload || ''} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAction({...newAction, payload: e.target.value})} 
            />
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={newAction.requiresConfirmation} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAction({...newAction, requiresConfirmation: e.target.checked})} 
              />
              Require Confirmation
            </label>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Save</Button>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {actions.map(action => (
          <div key={action.id} className="bg-card p-4 rounded-lg border border-border flex justify-between items-center">
            <div>
              <div className="font-semibold">{action.name}</div>
              <div className="text-sm text-muted-foreground">{action.type}: {action.payload}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleRun(action.id, action.type)}>
                <Play size={14} />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => removeAction(action.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
