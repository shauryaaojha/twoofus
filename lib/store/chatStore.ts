import { create } from 'zustand';
import type { Message } from '@/types';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  partnerTyping: boolean;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setTyping: (typing: boolean) => void;
  setPartnerTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  partnerTyping: false,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      // Prevent duplicates
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  setTyping: (isTyping) => set({ isTyping }),
  setPartnerTyping: (partnerTyping) => set({ partnerTyping }),
  clearMessages: () => set({ messages: [] }),
}));
