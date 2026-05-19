'use client';

import { useEffect, useRef } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import MessageInput from '@/components/chat/MessageInput';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatStore } from '@/lib/store/chatStore';
import { getSupabase } from '@/lib/supabase/client';
import { registerPushNotifications } from '@/lib/push';
import Link from 'next/link';
import { usePresence } from '@/hooks/usePresence';

export default function ChatPage() {
  const { loadMoreMessages, hasMoreMessages, isLoadingMore } = useRealtimeMessages();
  const { couple, user, partner } = useAuthStore();
  const setPartnerTyping = useChatStore((s) => s.setPartnerTyping);
  const partnerTyping = useChatStore((s) => s.partnerTyping);
  const { partnerOnline } = usePresence();
  const typingChannelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);

  useEffect(() => {
    registerPushNotifications();
  }, []);

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
    <div className="flex flex-col fixed inset-0 overflow-hidden bg-background z-50">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 h-16 bg-surface/90 backdrop-blur-md border-b border-surface-variant z-10 shrink-0 relative">
        <Link href="/home" className="text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2 rounded-full hover:bg-surface-variant/30 flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        {partner?.avatar_url ? (
          <img
            src={partner.avatar_url}
            alt={partner.display_name}
            className="w-10 h-10 rounded-full object-cover presence-glow"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
            <span className="text-on-primary-container text-base font-bold">
              {partner?.display_name?.[0] || '♥'}
            </span>
          </div>
        )}
        <div className="flex flex-col">
           <span className="font-medium text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>{partner?.display_name || 'Partner'}</span>
           <span className="text-xs text-on-surface-variant">
             {partnerTyping ? 'Typing...' : partnerOnline ? 'Online' : 'Offline'}
           </span>
        </div>
      </div>
      <ChatWindow 
        loadMoreMessages={loadMoreMessages} 
        hasMoreMessages={hasMoreMessages} 
        isLoadingMore={isLoadingMore} 
      />
      <MessageInput />
    </div>
  );
}
