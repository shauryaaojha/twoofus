'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

export function usePhotoQuota() {
  const { user } = useAuthStore();
  const [used, setUsed] = useState(0);
  const limit = 5;

  const fetchQuota = useCallback(async () => {
    if (!user?.id) return;
    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('photo_quota')
      .select('count')
      .eq('user_id', user.id)
      .eq('quota_date', today)
      .single();
    setUsed(data?.count ?? 0);
  }, [user?.id]);

  useEffect(() => { fetchQuota(); }, [fetchQuota]);

  const incrementQuota = useCallback(async () => {
    if (!user?.id) return false;
    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('photo_quota')
      .select('count')
      .eq('user_id', user.id)
      .eq('quota_date', today)
      .single();

    if (existing && existing.count >= limit) return false;

    if (existing) {
      await supabase
        .from('photo_quota')
        .update({ count: existing.count + 1 })
        .eq('user_id', user.id)
        .eq('quota_date', today);
    } else {
      await supabase
        .from('photo_quota')
        .insert({ user_id: user.id, quota_date: today, count: 1 });
    }
    setUsed((prev) => prev + 1);
    return true;
  }, [user?.id]);

  return { used, limit, remaining: limit - used, canUpload: used < limit, incrementQuota, fetchQuota };
}
