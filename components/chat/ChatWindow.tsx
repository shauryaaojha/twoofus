'use client';

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useChatStore } from '@/lib/store/chatStore';
import { useAuthStore } from '@/lib/store/authStore';
import MessageBubble from './MessageBubble';
import CallEventBubble from './CallEventBubble';
import TypingIndicator from './TypingIndicator';

interface ChatWindowProps {
  loadMoreMessages?: () => Promise<void>;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
}

export default function ChatWindow({ loadMoreMessages, hasMoreMessages, isLoadingMore }: ChatWindowProps) {
  const { messages } = useChatStore();
  const { partnerTyping } = useChatStore();
  const { user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  
  // Track previous scroll height to preserve scroll position when prepending messages
  const [prevScrollHeight, setPrevScrollHeight] = useState<number | null>(null);

  // Auto-scroll to bottom on first load or when sending/receiving a new message
  // But NOT when we just loaded older messages
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length === 0) return;

    const currentLastMessageId = messages[messages.length - 1].id;
    const isInitialLoad = lastMessageIdRef.current === null;

    if (currentLastMessageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = currentLastMessageId;
      
      if (isInitialLoad) {
        // Instant scroll for initial load to prevent smooth scroll from triggering the top-scroll fetch
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
        return;
      } else {
        // A new message was added later, enable auto-scroll
        setShouldAutoScroll(true);
      }
    }
    
    if (shouldAutoScroll && !isInitialLoad) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerTyping, shouldAutoScroll]);

  // Adjust scroll position after prepending older messages
  useLayoutEffect(() => {
    if (prevScrollHeight !== null && scrollRef.current) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop = newScrollHeight - prevScrollHeight;
      setPrevScrollHeight(null);
    }
  }, [messages, prevScrollHeight]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !loadMoreMessages || isLoadingMore || !hasMoreMessages) return;

    // Load more when user scrolls to the top (with a 50px buffer)
    if (scrollRef.current.scrollTop < 50) {
      setShouldAutoScroll(false);
      setPrevScrollHeight(scrollRef.current.scrollHeight);
      loadMoreMessages();
    }
  }, [loadMoreMessages, isLoadingMore, hasMoreMessages]);

  return (
    <div 
      className="flex-1 overflow-y-auto px-5 py-4 hide-scrollbar" 
      ref={scrollRef}
      onScroll={handleScroll}
    >
      <div className="flex flex-col gap-3 max-w-[1100px] mx-auto">
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
          </div>
        )}
        
        {messages.length === 0 && !isLoadingMore && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">💌</span>
            <p className="text-on-surface-variant text-lg" style={{ fontFamily: 'var(--font-headline)' }}>
              Start your conversation
            </p>
            <p className="text-outline text-sm mt-2">Messages are end-to-end encrypted</p>
          </div>
        )}
        
        {messages.map((msg) => {
          if (msg.type === 'call') {
            return <CallEventBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />;
          }
          return <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />;
        })}
        {partnerTyping && <TypingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  );
}
