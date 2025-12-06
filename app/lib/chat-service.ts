import { db } from './db/wasm-db';
import { explainCode } from './explainer';
import { useSettingsStore } from './store/settings-store';
import Groq from 'groq-sdk';
import { ChatMessage } from '../../shared/types/db';

// Parse natural language time strings like "5pm", "in 30 minutes", "tomorrow at 9am"
function parseNaturalTime(timeStr: string): Date | null {
  const now = new Date();
  const lower = timeStr.toLowerCase().trim();
  
  // "in X minutes/hours"
  const inMatch = lower.match(/^(\d+)\s*(minute|min|hour|hr|second|sec)s?$/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2];
    const result = new Date(now);
    if (unit.startsWith('min')) result.setMinutes(result.getMinutes() + amount);
    else if (unit.startsWith('hour') || unit === 'hr') result.setHours(result.getHours() + amount);
    else if (unit.startsWith('sec')) result.setSeconds(result.getSeconds() + amount);
    return result;
  }
  
  // "tomorrow" or "tomorrow at Xpm"
  if (lower.includes('tomorrow')) {
    const result = new Date(now);
    result.setDate(result.getDate() + 1);
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const mins = parseInt(timeMatch[2] || '0');
      const period = timeMatch[3];
      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      result.setHours(hours, mins, 0, 0);
    } else {
      result.setHours(9, 0, 0, 0); // Default to 9am
    }
    return result;
  }
  
  // Just time like "5pm", "3:30pm", "15:00"
  const timeMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const mins = parseInt(timeMatch[2] || '0');
    const period = timeMatch[3];
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    const result = new Date(now);
    result.setHours(hours, mins, 0, 0);
    // If time already passed today, set for tomorrow
    if (result <= now) result.setDate(result.getDate() + 1);
    return result;
  }
  
  // Try native Date parsing as fallback
  const parsed = new Date(timeStr);
  if (!isNaN(parsed.getTime()) && parsed > now) {
    return parsed;
  }
  
  return null;
}

export class ChatService {
  static async processMessage(content: string, history: ChatMessage[] = []): Promise<string> {
    const lower = content.toLowerCase();

    // 1. Code Explanation
    if (content.includes('```') || content.includes('function ')) {
      const explanation = explainCode(content);
      return `I see some code here!\n\n**Language:** ${explanation.language}\n**Complexity:** ${explanation.complexity}\n\n${explanation.summary}`;
    }

    // 2. Reminder Command - "remind me to X at/in Y"
    const reminderMatch = lower.match(/remind(?:\s+me)?\s+(?:to\s+)?(.+?)(?:\s+(?:at|in|on)\s+)(.+)/i);
    if (reminderMatch) {
      const task = reminderMatch[1].trim();
      const timeStr = reminderMatch[2].trim();
      const dueDate = parseNaturalTime(timeStr);
      
      if (dueDate) {
        await db.init(); // Ensure DB is initialized
        const id = await db.createReminder({
          title: task,
          message: `Reminder set via chat: ${content}`,
          due_date: dueDate.getTime(),
        });
        console.log("[ChatService] Created reminder with ID:", id, "due at:", dueDate);
        return `✅ Reminder set!\n\n**Task:** ${task}\n**When:** ${dueDate.toLocaleString()}\n\nI'll notify you when it's time!`;
      } else {
        return `I couldn't understand the time "${timeStr}". Try formats like:\n- "at 5pm"\n- "in 30 minutes"\n- "tomorrow at 9am"\n- "on Dec 25 at noon"`;
      }
    }

    // 3. Explicit Memory Command
    if (lower.startsWith('remember ')) {
        const memory = content.replace(/^remember /i, '').trim();
        if (memory) {
          await db.createMemory('note', memory, 'chat');
          return `I've saved that to your memory bank: "${memory}"`;
        }
    }

    // 2. Groq Remote API
    const { groqApiKey } = useSettingsStore.getState();
    if (groqApiKey) {
      try {
        const groq = new Groq({ 
            apiKey: groqApiKey, 
            dangerouslyAllowBrowser: true 
        });

        // Get context from memory
        const memories = await db.searchMemories(content);
        const memoryContext = memories.map(m => `- ${m.content} (${new Date(m.created_at).toLocaleDateString()})`).join('\n');
        
        const systemPrompt = `You are HER, a highly intelligent and helpful AI assistant.
        
        CONTEXT FROM USER'S PAST:
        ${memoryContext}
        
        INSTRUCTIONS:
        - Be concise, friendly, and helpful.
        - Use context to provide personalized answers.
        - You are running on Groq Llama 3 70B.`;

        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content }
        ];

        const completion = await groq.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        return completion.choices[0]?.message?.content || "I'm not sure how to respond.";

      } catch (e: any) {
        console.error("Groq Error:", e);
        return `Groq Error: ${e.message}. \nPlease check your API Key in Settings.`;
      }
    }

    // 3. Local Fallbacks
    if (lower.startsWith('hello') || lower.startsWith('hi')) {
      return "Hello! I am HER, your local AI assistant. Add a Groq Key in Settings to make me smarter!";
    }

    if (lower.includes('time')) {
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    }

    if (lower.includes('date')) {
      return `Today is ${new Date().toLocaleDateString()}.`;
    }

    if (lower.startsWith('remember ')) {
      const memory = content.replace(/^remember /i, '').trim();
      if (memory) {
        await db.createMemory('note', memory, 'chat');
        return `I've saved that to your memory bank: "${memory}"`;
      }
    }

    if (lower.includes('search memory') || lower.includes('what do you know about')) {
        const query = lower.replace('search memory', '').replace('what do you know about', '').trim();
        if (query) {
            const results = await db.searchMemories(query);
            if (results.length > 0) {
                const top = results.map(r => `- ${r.content} (${new Date(r.created_at).toLocaleDateString()})`).join('\n');
                return `Here is what I found:\n${top}`;
            } else {
                return `I couldn't find anything matching "${query}" in your memories.`;
            }
        }
    }

    return "I'm currently in local mode. Please add a Groq API Key in Settings to unlock LLM capabilities.";
  }
}
