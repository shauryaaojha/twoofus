'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

export function usePresence() {
  const { user, couple } = useAuthStore();
  const [partnerOnline, setPartnerOnline] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);

  useEffect(() => {
    if (!user?.id || !couple?.id) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`presence:${couple.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const partnerId = couple.user_a === user.id ? couple.user_b : couple.user_a;
        setPartnerOnline(!!partnerId && !!state[partnerId]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [user?.id, couple]);

  return { partnerOnline };
}
