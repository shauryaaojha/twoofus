'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

export function usePresence() {
  const { user, couple, partner } = useAuthStore();
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | undefined>(partner?.last_seen);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);

  useEffect(() => {
    if (!user?.id || !couple?.id) return;
    const supabase = getSupabase();
    const partnerId = couple.user_a === user.id ? couple.user_b : couple.user_a;

    const channel = supabase.channel(`presence:${couple.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const metas = partnerId ? state[partnerId] : undefined;
        const isOnline = Array.isArray(metas) && metas.length > 0;
        
        setPartnerOnline((prev) => {
          if (prev && !isOnline) {
            // Partner just went offline
            setPartnerLastSeen(new Date().toISOString());
          }
          return isOnline;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // Handle tab visibility changes to save last seen without expensive polling
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Subscribe to partner profile changes for real-time last_seen updates
    let profileSubscription: ReturnType<typeof supabase.channel> | null = null;
    if (partnerId) {
      profileSubscription = supabase
        .channel(`partner-profile-${partnerId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${partnerId}`,
          },
          (payload) => {
            if (payload.new && payload.new.last_seen) {
              setPartnerLastSeen(payload.new.last_seen);
            }
          }
        )
        .subscribe();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel.unsubscribe();
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, [user?.id, couple?.id]); // couple object changing might trigger too many reconnects, use couple?.id instead

  return { partnerOnline, partnerLastSeen };
}
