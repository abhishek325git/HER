import { useEffect, useState } from 'react';
import { db } from '../lib/db/wasm-db';
import { Memory } from '../../shared/types/db';
import { Input } from '../components/ui/input';
import { Brain, Search, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState('');

  const loadMemories = async () => {
    await db.init();
    if (search.trim()) {
      const results = await db.searchMemories(search);
      setMemories(results);
    } else {
      const results = await db.getMemories();
      setMemories(results);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [search]);

  const handleDelete = async (id: number) => {
      await db.deleteMemory(id);
      loadMemories();
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Memory Bank</h1>
        <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search memories..." 
                className="pl-8"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        {memories.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                <Brain size={48} className="mx-auto mb-4 opacity-50"/>
                <p>No memories found. Chat with HER to create some!</p>
            </div>
        )}
        {memories.map((m) => (
          <div key={m.id} className="bg-card p-4 rounded-lg border border-border shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground uppercase font-bold tracking-wider">
                    {m.category || 'General'}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm line-clamp-4 flex-1">{m.content}</p>
            <div className="mt-4 flex justify-end">
                 <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}>
                    <Trash2 size={14} className="text-destructive" />
                 </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
