import { create } from 'zustand';

export interface Action {
  id: string;
  name: string;
  type: 'open_url' | 'open_app' | 'play_audio';
  payload: string;
  requiresConfirmation: boolean;
}

interface AutomationState {
  actions: Action[];
  addAction: (action: Omit<Action, 'id'>) => void;
  removeAction: (id: string) => void;
  runAction: (id: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  actions: [
    {
      id: '1',
      name: 'Open Spotify',
      type: 'open_url',
      payload: 'https://open.spotify.com',
      requiresConfirmation: false
    },
    {
      id: '2',
      name: 'Emergency Cleanup',
      type: 'open_app',
      payload: 'cleanup.exe',
      requiresConfirmation: true
    }
  ],
  
  addAction: (action) => {
    const newAction = { ...action, id: Math.random().toString(36).substr(2, 9) };
    set(state => ({ actions: [...state.actions, newAction] }));
  },

  removeAction: (id) => {
    set(state => ({ actions: state.actions.filter(a => a.id !== id) }));
  },

  runAction: async (id) => {
    const action = get().actions.find(a => a.id === id);
    if (!action) return;

    if (action.requiresConfirmation) {
      if (!confirm(`Are you sure you want to run "${action.name}"?`)) return;
    }

    console.log(`Running action: ${action.name} (${action.type})`);
    
    // In Native mode, this would use electronAPI to spawn process
    if (action.type === 'open_url') {
      window.open(action.payload, '_blank');
    } else {
      alert(`Simulating Native Action: Open ${action.payload}`);
    }
  }
}));
