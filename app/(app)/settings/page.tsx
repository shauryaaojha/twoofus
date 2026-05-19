'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { getSupabase } from '@/lib/supabase/client';
import { exportPrivateKey, importPrivateKey, clearAllKeys } from '@/lib/crypto/keyManager';
import { useToastStore } from '@/lib/store/toastStore';
import ThemeSwitcher from '@/components/themes/ThemeSwitcher';
import ChatThemePicker from '@/components/themes/ChatThemePicker';
import ChatBgGallery from '@/components/themes/ChatBgGallery';

export default function SettingsPage() {
  const { profile, couple, user, reset, setProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [anniversary, setAnniversary] = useState(couple?.anniversary_date || '');
  const [songUrl, setSongUrl] = useState(couple?.our_song_url || '');
  const [notifMoments, setNotifMoments] = useState(true);
  const [notifPresence, setNotifPresence] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const router = useRouter();
  const toast = useToastStore();

  const saveProfile = async () => {
    if (!user?.id) return;
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      toast.show('Name cannot be empty', 'error');
      setDisplayName(profile?.display_name || '');
      return;
    }

    const nextAvatarUrl = avatarUrl.trim() || null;
    const supabase = getSupabase();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: nextDisplayName,
        avatar_url: nextAvatarUrl,
      })
      .eq('id', user.id);

    if (error) {
      toast.show('Could not save profile', 'error');
      return;
    }

    if (profile) {
      setProfile({
        ...profile,
        display_name: nextDisplayName,
        avatar_url: nextAvatarUrl,
      });
    }
    toast.show('Profile saved', 'success');
  };

  const saveSettings = async () => {
    if (!couple?.id) return;
    const supabase = getSupabase();
    await supabase.from('couples').update({
      anniversary_date: anniversary || null,
      our_song_url: songUrl || null,
    }).eq('id', couple.id);
    toast.show('Settings saved', 'success');
  };

  const handleExportKeys = () => {
    const key = exportPrivateKey();
    if (!key) { toast.show('No key found', 'error'); return; }
    const blob = new Blob([key], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'twoofus-private-key.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.show('Key exported', 'success');
  };

  const handleImportKeys = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        importPrivateKey(text.trim());
        toast.show('Key imported successfully', 'success');
      } catch {
        toast.show('Invalid key file', 'error');
      }
    };
    input.click();
  };

  const handleEndRelationship = async () => {
    if (!couple?.id) return;
    setEnding(true);
    const supabase = getSupabase();
    await supabase.from('couples').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', couple.id);
    setShowEndConfirm(false);
    setEnding(false);
    toast.show('Relationship ended', 'info');
    reset();
    router.push('/pair');
  };

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    clearAllKeys();
    reset();
    router.push('/login');
  };

  return (
    <div className="px-5 md:px-[120px] max-w-[600px] mx-auto flex flex-col gap-12 pt-8">
      {/* Profile header */}
      <section className="flex flex-col items-center text-center mt-8">
        <div className="relative mb-6">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-32 h-32 rounded-full object-cover border-2 border-surface-variant" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center border-2 border-surface-variant">
              <span className="text-4xl text-on-primary-container font-bold">{profile?.display_name?.[0] || '?'}</span>
            </div>
          )}
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
          {profile?.display_name}
        </h2>
        <p className="text-base text-on-surface-variant mt-2" style={{ fontFamily: 'var(--font-body)' }}>
          {user?.email}
        </p>
      </section>

      {/* Account */}
      <section className="glass-card rounded-xl p-6 flex flex-col gap-6">
        <h3 className="text-2xl font-medium text-on-surface border-b border-surface-variant pb-2" style={{ fontFamily: 'var(--font-headline)' }}>Account</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-1" style={{ fontFamily: 'var(--font-label)' }}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={saveProfile}
              className="minimal-input"
              placeholder="Your name"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-1" style={{ fontFamily: 'var(--font-label)' }}>Avatar URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              onBlur={saveProfile}
              className="minimal-input"
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      {/* Theming */}
      <section className="glass-card rounded-xl p-6 flex flex-col gap-8">
        <div>
          <h3 className="text-2xl font-medium text-on-surface border-b border-surface-variant pb-2 mb-4" style={{ fontFamily: 'var(--font-headline)' }}>UI Theme</h3>
          <p className="text-sm text-on-surface-variant mb-4">Set the colors for your app. This only affects you.</p>
          <ThemeSwitcher />
        </div>

        <div>
          <div className="flex justify-between items-end border-b border-surface-variant pb-2 mb-4">
            <h3 className="text-2xl font-medium text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>Chat Theme</h3>
            <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-md uppercase tracking-wider">Shared</span>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Set the bubble styles for your chat. Both of you will see this theme.</p>
          <ChatThemePicker />
        </div>

        <div>
          <div className="flex justify-between items-end border-b border-surface-variant pb-2 mb-4">
            <h3 className="text-2xl font-medium text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>Chat Background</h3>
            <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-md uppercase tracking-wider">Shared</span>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Set the wallpaper behind your messages.</p>
          <ChatBgGallery />
        </div>
      </section>

      {/* Invite / Unpaired State */}
      {!couple || !couple.user_b ? (
        <section className="glass-card rounded-xl p-6 flex flex-col gap-6">
          <h3 className="text-2xl font-medium text-on-surface border-b border-surface-variant pb-2" style={{ fontFamily: 'var(--font-headline)' }}>Connection</h3>
          <div className="flex flex-col gap-4 items-start">
            <p className="text-sm text-on-surface-variant">You are currently not paired with anyone. Invite a partner to start sharing moments and chatting securely.</p>
            <button
              onClick={() => router.push('/pair')}
              className="py-3 px-6 rounded-full bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span> Invite Partner
            </button>
          </div>
        </section>
      ) : (
        <section className="glass-card rounded-xl p-6 flex flex-col gap-6">
          <h3 className="text-2xl font-medium text-on-surface border-b border-surface-variant pb-2" style={{ fontFamily: 'var(--font-headline)' }}>Our Story</h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-1" style={{ fontFamily: 'var(--font-label)' }}>Anniversary</label>
              <input type="date" value={anniversary} onChange={(e) => setAnniversary(e.target.value)} onBlur={saveSettings} className="minimal-input" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-1" style={{ fontFamily: 'var(--font-label)' }}>Our Song URL</label>
              <input type="url" value={songUrl} onChange={(e) => setSongUrl(e.target.value)} onBlur={saveSettings} className="minimal-input" placeholder="Spotify or Apple Music link" />
            </div>
          </div>
        </section>
      )}

      {/* Privacy */}
      <section className="glass-card rounded-xl p-6 flex flex-col gap-6">
        <h3 className="text-2xl font-medium text-on-surface border-b border-surface-variant pb-2" style={{ fontFamily: 'var(--font-headline)' }}>Privacy</h3>
        <p className="text-sm text-on-surface-variant">Your messages are end-to-end encrypted. Keys are backed up securely in the cloud, encrypted with your password.</p>
        <div className="flex gap-4">
          <button onClick={handleExportKeys} className="flex-1 py-3 px-4 rounded-full border border-surface-variant text-on-surface text-sm hover:bg-surface-variant/30 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span>Export Keys
          </button>
          <button onClick={handleImportKeys} className="flex-1 py-3 px-4 rounded-full border border-surface-variant text-on-surface text-sm hover:bg-surface-variant/30 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">upload</span>Import Keys
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="glass-card rounded-xl p-6 flex flex-col gap-6">
        <h3 className="text-2xl font-medium text-on-surface border-b border-surface-variant pb-2" style={{ fontFamily: 'var(--font-headline)' }}>Notifications</h3>
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div><span className="text-lg text-on-surface">Moments</span><br /><span className="text-sm text-on-surface-variant">When they share a memory</span></div>
            <button onClick={() => setNotifMoments(!notifMoments)} className={`toggle-track ${notifMoments ? 'active' : ''}`}><div className="toggle-thumb" /></button>
          </div>
          <div className="flex justify-between items-center">
            <div><span className="text-lg text-on-surface">Presence</span><br /><span className="text-sm text-on-surface-variant">When they are online</span></div>
            <button onClick={() => setNotifPresence(!notifPresence)} className={`toggle-track ${notifPresence ? 'active' : ''}`}><div className="toggle-thumb" /></button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl p-6 flex flex-col gap-6 border border-error/20">
        <h3 className="text-2xl font-medium text-error border-b border-error/20 pb-2" style={{ fontFamily: 'var(--font-headline)' }}>Danger Zone</h3>
        {!showEndConfirm ? (
          <button onClick={() => setShowEndConfirm(true)} className="py-3 px-6 rounded-full border border-error/30 text-error text-sm hover:bg-error/10 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">heart_broken</span>End Relationship
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-on-surface-variant">This will end your current relationship. Chat history will be preserved but read-only. You can pair with someone new afterward.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 rounded-full border border-surface-variant text-on-surface text-sm">Cancel</button>
              <button onClick={handleEndRelationship} disabled={ending} className="flex-1 py-3 rounded-full bg-error text-on-error text-sm disabled:opacity-50">
                {ending ? 'Ending...' : 'Confirm End'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Sign out */}
      <section className="flex justify-center mb-16">
        <button onClick={handleSignOut} className="py-4 px-8 rounded-full border border-outline-variant/30 text-on-surface-variant text-lg hover:bg-surface-variant/20 transition-colors flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">logout</span>Sign Out
        </button>
      </section>
    </div>
  );
}
