'use client';

import { useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store/chatStore';
import { useAuthStore } from '@/lib/store/authStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function ChatWindow() {
  const { messages } = useChatStore();
  const { partnerTyping } = useChatStore();
  const { user } = useAuthStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 hide-scrollbar">
      <div className="flex flex-col gap-3 max-w-[1100px] mx-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">💌</span>
            <p className="text-on-surface-variant text-lg" style={{ fontFamily: 'var(--font-headline)' }}>
              Start your conversation
            </p>
            <p className="text-outline text-sm mt-2">Messages are end-to-end encrypted</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />
        ))}
        {partnerTyping && <TypingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  );
}
