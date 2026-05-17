'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

const moods = ['🥰', '😴', '😭', '🔥', '💕', '😎', '🤗', '😤', '✨', '🌙'];

export default function MoodSelector() {
  const { profile, setProfile, user } = useAuthStore();
  const [open, setOpen] = useState(false);

  const selectMood = async (mood: string) => {
    if (!user?.id) return;
    const supabase = getSupabase();
    await supabase.from('profiles').update({ mood }).eq('id', user.id);
    if (profile) setProfile({ ...profile, mood });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="glass-card rounded-full px-5 py-2.5 flex items-center gap-2 hover:bg-surface-variant/30 transition-all"
      >
        <span className="text-2xl">{profile?.mood || '🥰'}</span>
        <span className="text-sm text-on-surface-variant" style={{ fontFamily: 'var(--font-body)' }}>My Mood</span>
        <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 glass-card rounded-2xl p-4 flex flex-wrap gap-2 max-w-[240px] z-50 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => selectMood(m)}
              className={`text-2xl p-2 rounded-xl transition-all hover:bg-surface-variant/50 ${profile?.mood === m ? 'bg-primary/20 ring-2 ring-primary/40' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
