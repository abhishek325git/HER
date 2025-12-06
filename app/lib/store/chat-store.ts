import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/wasm-db';
import { ChatMessage } from '../../../shared/types/db';
import { ChatService } from '../chat-service';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,

      initialize: async () => {
        await db.init();
        const history = await db.getHistory();
        // Merge: prefer DB history if it has more messages
        if (history.length > get().messages.length) {
          set({ messages: history });
        }
      },

      sendMessage: async (content: string) => {
        const userMsg: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: Date.now()
        };

        set(state => ({ 
          messages: [...state.messages, userMsg],
          isLoading: true
        }));

        await db.saveMessage(userMsg);

        try {
          const aiResponseContent = await ChatService.processMessage(content, get().messages);
          
          const assistantMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: aiResponseContent,
            timestamp: Date.now()
          };

          await db.saveMessage(assistantMsg);
          set(state => ({
            messages: [...state.messages, assistantMsg],
            isLoading: false
          }));
        } catch (error) {
           console.error("Chat Error", error);
           set({ isLoading: false });
        }
      },

      clearChat: async () => {
        await db.clearHistory();
        set({ messages: [] });
      }
    }),
    {
      name: 'her-chat-storage', // localStorage key
      partialize: (state) => ({ messages: state.messages }), // Only persist messages
    }
  )
);
