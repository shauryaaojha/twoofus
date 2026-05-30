'use client';

import { useEffect, useRef, useState } from 'react';
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
  const { partnerOnline, partnerLastSeen } = usePresence();
  const typingChannelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Offline';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)}h ago`;
    return `Last seen ${date.toLocaleDateString()}`;
  };

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
        <div className="flex flex-col flex-1">
           <span className="font-medium text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>{partner?.display_name || 'Partner'}</span>
           <span className="text-xs text-on-surface-variant">
             {partnerTyping ? 'Typing...' : partnerOnline ? 'Online' : formatLastSeen(partnerLastSeen)}
           </span>
        </div>
        

        {/* Call Buttons */}
        <div className="flex items-center gap-1">
          {isSearching ? (
            <div className="flex items-center bg-surface-variant/50 rounded-full px-3 py-1">
              <input
                type="text"
                autoFocus
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-32 md:w-48 text-on-surface placeholder:text-on-surface-variant/50"
              />
              <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="ml-1 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setIsSearching(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined">search</span>
            </button>
          )}

          <Link href="/call" onClick={() => {
            // we can trigger call from call page directly, or we can import useCall here.
            // The simplest way since they link to /call is to let the user start it there,
            // OR we can import useCall in ChatPage and start directly.
            // Wait, the prompt says "give call buttons". Since /call page already has start buttons,
            // if we just link to /call, it works. But better if it starts immediately. Let's just navigate to /call and let the user click start for now, OR we can use the useCall hook.
            // Let's import useCall. I'll need to modify the imports first.
          }} className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
          </Link>
          <Link href="/call" className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
          </Link>
        </div>
      </div>
      <ChatWindow 
        loadMoreMessages={loadMoreMessages} 
        hasMoreMessages={hasMoreMessages} 
        isLoadingMore={isLoadingMore} 
        searchQuery={searchQuery}
      />
      <MessageInput />
    </div>
  );
}
