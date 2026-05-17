'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { usePresence } from '@/hooks/usePresence';
import DaysCounter from '@/components/home/DaysCounter';
import MoodSelector from '@/components/home/MoodSelector';
import SongCard from '@/components/home/SongCard';
import PresenceIndicator from '@/components/shared/PresenceIndicator';
import Link from 'next/link';

export default function HomePage() {
  const { couple, partner, profile } = useAuthStore();
  const { partnerOnline } = usePresence();

  return (
    <div className="px-5 md:px-[120px] max-w-[1100px] mx-auto">
      {/* Hero section */}
      <section className="flex flex-col items-center text-center pt-12 pb-8">
        {/* Partner info */}
        {partner ? (
          <div className="flex items-center gap-3 mb-8">
            <div className="relative">
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt={partner.display_name} className="w-16 h-16 rounded-full object-cover border-2 border-surface-variant" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center border-2 border-surface-variant">
                  <span className="text-2xl text-on-primary-container font-bold">{partner.display_name?.[0]}</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1">
                <PresenceIndicator online={partnerOnline} />
              </div>
            </div>
            <div className="text-left">
              <p className="text-lg text-on-surface font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                {partner.display_name}
              </p>
              <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
                {partnerOnline ? 'Online' : 'Offline'}
                {partner.mood && <span className="text-lg">{partner.mood}</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-8 bg-surface-container-low p-6 rounded-2xl w-full max-w-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-[48px] text-tertiary mb-3 block">diversity_1</span>
            {couple ? (
              <>
                <h2 className="text-xl text-on-surface mb-2 font-medium">Waiting for partner...</h2>
                <p className="text-sm text-on-surface-variant mb-4">Your invite is active. Waiting for them to join.</p>
                <Link href="/pair" className="btn-secondary py-2 px-6 rounded-full text-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">share</span> View Invite
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-xl text-on-surface mb-2 font-medium">You're flying solo</h2>
                <p className="text-sm text-on-surface-variant mb-4">Invite someone to start your private space.</p>
                <Link href="/pair" className="btn-primary py-2 px-6 rounded-full text-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">person_add</span> Invite Partner
                </Link>
              </>
            )}
          </div>
        )}

        {couple && <DaysCounter pairedAt={couple.paired_at || couple.created_at || null} />}

        {/* Mood selector */}
        <div className="mt-8">
          <MoodSelector />
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/chat" className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3 hover:bg-surface-variant/20 transition-all group">
          <span className="material-symbols-outlined text-[32px] text-primary group-hover:scale-110 transition-transform">chat_bubble</span>
          <span className="text-sm text-on-surface-variant">Messages</span>
        </Link>
        <Link href="/call" className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3 hover:bg-surface-variant/20 transition-all group">
          <span className="material-symbols-outlined text-[32px] text-tertiary group-hover:scale-110 transition-transform">videocam</span>
          <span className="text-sm text-on-surface-variant">Video Call</span>
        </Link>
      </section>

      {/* Our song */}
      <section className="mb-8">
        <SongCard url={couple?.our_song_url || null} />
      </section>

      {/* Memory section */}
      <section className="glass-card rounded-2xl p-6 mb-8">
        <h3 className="text-xs font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-4" style={{ fontFamily: 'var(--font-label)' }}>
          Our Memories
        </h3>
        <div className="flex items-center justify-center py-8 text-center">
          <div>
            <span className="material-symbols-outlined text-[48px] text-surface-variant mb-3 block">photo_library</span>
            <p className="text-sm text-on-surface-variant">Share photos to build your memory wall</p>
          </div>
        </div>
      </section>

      {/* Encryption badge */}
      <div className="flex items-center justify-center gap-2 pb-8">
        <span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
        <span className="text-[11px] text-outline" style={{ fontFamily: 'var(--font-mono)' }}>
          End-to-end encrypted
        </span>
      </div>
    </div>
  );
}
