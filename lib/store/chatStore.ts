import { create } from 'zustand';
import type { Message } from '@/types';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  partnerTyping: boolean;
  replyToMessage: Message | null;
  setMessages: (messages: Message[]) => void;
  prependMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setTyping: (typing: boolean) => void;
  setPartnerTyping: (typing: boolean) => void;
  setReplyToMessage: (message: Message | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  partnerTyping: false,
  replyToMessage: null,
  setMessages: (messages) => set({ messages }),
  prependMessages: (olderMessages) => 
    set((state) => {
      // Filter out any duplicates that might overlap
      const existingIds = new Set(state.messages.map(m => m.id));
      const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
      return { messages: [...newMessages, ...state.messages] };
    }),
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
  setReplyToMessage: (replyToMessage) => set({ replyToMessage }),
  clearMessages: () => set({ messages: [] }),
}));
