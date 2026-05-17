'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { decryptMessage } from '@/lib/crypto/e2ee';
import { getMyKeys } from '@/lib/crypto/keyManager';
import { useChatStore } from '@/lib/store/chatStore';
import { useAuthStore } from '@/lib/store/authStore';
import { decodeBase64 } from 'tweetnacl-util';
import type { Message } from '@/types';

export function useRealtimeMessages() {
  const { couple, partner, user } = useAuthStore();
  const { addMessage, setMessages, messages } = useChatStore();
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);

  const decryptMsg = useCallback((msg: Message): Message => {
    if (msg.type === 'reaction') return { ...msg, plaintext: msg.ciphertext };
    const keys = getMyKeys();
    if (!keys || !partner?.public_key) return { ...msg, plaintext: '[encrypted]' };
    const partnerPub = decodeBase64(partner.public_key);
    const plaintext = decryptMessage(msg.ciphertext, msg.nonce, partnerPub, keys.secretKey);
    return { ...msg, plaintext: plaintext || '[decryption failed]' };
  }, [partner]);

  // Mark unseen partner messages as seen
  const markAsSeen = useCallback(async () => {
    if (!couple?.id || !user?.id) return;
    const supabase = getSupabase();
    await supabase
      .from('messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('couple_id', couple.id)
      .neq('sender_id', user.id)
      .is('seen_at', null);
  }, [couple?.id, user?.id]);

  const fetchMessages = useCallback(async () => {
    if (!couple?.id) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('couple_id', couple.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      setMessages(data.map(decryptMsg));
      // Mark partner messages as seen only if tab is currently visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        markAsSeen();
      }
    }
  }, [couple?.id, decryptMsg, setMessages, markAsSeen]);

  // Handle focus and tab visibility change to auto-mark messages as seen
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        markAsSeen();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Initial check on mount
    handleFocus();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [markAsSeen]);

  // Update document title tab with unread count
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return;

    const unreadCount = messages.filter(
      (m) => m.sender_id !== user.id && !m.seen_at && !m.deleted_at
    ).length;

    const baseTitle = "TwoOfUs — A Private Universe for Two";
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [messages, user?.id]);

  useEffect(() => {
    if (!couple?.id) return;
    fetchMessages();

    const supabase = getSupabase();
    channelRef.current = supabase
      .channel(`messages:${couple.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${couple.id}` },
        (payload) => {
          const msg = payload.new as Message;
          addMessage(decryptMsg(msg));
          // Auto-mark seen if from partner and tab is visible
          if (msg.sender_id !== user?.id && typeof document !== 'undefined' && document.visibilityState === 'visible') {
            markAsSeen();
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `couple_id=eq.${couple.id}` },
        (payload) => {
          const msg = payload.new as Message;
          useChatStore.getState().updateMessage(msg.id, {
            seen_at: msg.seen_at,
            deleted_at: msg.deleted_at,
            reaction: msg.reaction,
          });
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [couple?.id, fetchMessages, addMessage, decryptMsg, user?.id, markAsSeen]);

  return { fetchMessages };
}
