'use client';

import { useEffect, useRef } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import MessageInput from '@/components/chat/MessageInput';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatStore } from '@/lib/store/chatStore';
import { getSupabase } from '@/lib/supabase/client';

export default function ChatPage() {
  useRealtimeMessages();
  const { couple, user } = useAuthStore();
  const setPartnerTyping = useChatStore((s) => s.setPartnerTyping);
  const typingChannelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);

  // Subscribe to typing broadcast channel
  useEffect(() => {
    if (!couple?.id || !user?.id) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`typing:${couple.id}`);

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== user.id) {
          setPartnerTyping(true);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload?.userId !== user.id) {
          setPartnerTyping(false);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [couple?.id, user?.id, setPartnerTyping]);

  return (
    <div className="flex flex-col fixed top-16 bottom-[80px] md:bottom-0 left-0 right-0 overflow-hidden bg-background">
      <ChatWindow />
      <MessageInput />
    </div>
  );
}
