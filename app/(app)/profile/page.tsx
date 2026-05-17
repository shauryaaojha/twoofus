'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';

export default function ProfilePage() {
  const { user, profile, partner, couple } = useAuthStore();
  const joinedAt = profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : null;
  const pairedAt = couple?.paired_at || couple?.created_at;

  return (
    <div className="px-5 md:px-[120px] max-w-[760px] mx-auto flex flex-col gap-8 pt-8">
      <section className="flex flex-col items-center text-center pt-8">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name || 'Profile'}
            className="w-32 h-32 rounded-full object-cover border-2 border-surface-variant mb-6"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center border-2 border-surface-variant mb-6">
            <span className="text-4xl text-on-primary-container font-bold">
              {profile?.display_name?.[0] || user?.email?.[0] || '?'}
            </span>
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
          {profile?.display_name || 'Your Profile'}
        </h1>
        <p className="text-base text-on-surface-variant mt-2">{user?.email}</p>

        <div className="flex items-center gap-3 mt-6">
          <Link href="/settings" className="btn-primary py-3 px-6 text-sm inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Profile
          </Link>
          <Link href="/pair" className="py-3 px-6 rounded-full border border-outline-variant/30 text-sm text-on-surface hover:bg-surface-variant/20 transition-colors inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">group_add</span>
            Pairing
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2" style={{ fontFamily: 'var(--font-label)' }}>Mood</p>
          <p className="text-3xl">{profile?.mood || '🥰'}</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2" style={{ fontFamily: 'var(--font-label)' }}>Joined</p>
          <p className="text-lg text-on-surface">{joinedAt || 'Recently'}</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2" style={{ fontFamily: 'var(--font-label)' }}>Encryption</p>
          <p className="text-lg text-tertiary">Active</p>
        </div>
      </section>

      <section className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>Connection</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {partner
                ? `Paired with ${partner.display_name || 'your partner'}${pairedAt ? ` since ${new Date(pairedAt).toLocaleDateString()}` : ''}.`
                : 'No active partner yet. Invite someone to start your private space.'}
            </p>
          </div>
          {partner?.avatar_url ? (
            <img src={partner.avatar_url} alt={partner.display_name || 'Partner'} className="w-14 h-14 rounded-full object-cover border border-outline-variant/30" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">diversity_1</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
