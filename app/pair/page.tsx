'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { rotateKeysForNewRelationship, hasSessionKeys } from '@/lib/crypto/keyManager';
import { hasCachedAesKey } from '@/lib/crypto/keyVault';
import { useToastStore } from '@/lib/store/toastStore';
import Toast from '@/components/shared/Toast';

export default function PairPage() {
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [isRePairing, setIsRePairing] = useState(false);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const toast = useToastStore();

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Check if user has keys set up in their database profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('encrypted_private_key')
        .eq('id', user.id)
        .single();

      if (!profile?.encrypted_private_key || !hasSessionKeys()) {
        router.push('/unlock');
        return;
      }

      // Check if already in an active couple
      const { data: active } = await supabase
        .from('couples').select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .not('user_b', 'is', null)
        .eq('status', 'active')
        .single();

      if (active) { router.push('/home'); return; }

      // Check for pending invite (user_a created, user_b null, still active)
      const { data: pending } = await supabase
        .from('couples').select('*')
        .eq('user_a', user.id)
        .is('user_b', null)
        .eq('status', 'active')
        .single();

      if (pending) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setInviteLink(`${baseUrl}/invite/${pending.invite_token}`);
        setWaitingForPartner(true);
      }

      // Check if user had a previous ended relationship (re-pairing)
      const { data: ended } = await supabase
        .from('couples').select('id')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq('status', 'ended')
        .limit(1);

      if (ended && ended.length > 0) {
        setIsRePairing(true);
        // Need password if no cached AES key in session
        setNeedsPassword(!hasCachedAesKey());
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const createInvite = async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCreating(true);

    // If re-pairing, rotate E2EE keys (new relationship = new keys)
    if (isRePairing) {
      if (needsPassword && !password) {
        toast.show('Enter your password to set up encryption', 'error');
        setCreating(false);
        return;
      }
      const newPubKey = await rotateKeysForNewRelationship(
        supabase, user.id, needsPassword ? password : undefined
      );
      if (!newPubKey) {
        toast.show('Failed to generate new keys. Check your password.', 'error');
        setCreating(false);
        return;
      }
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('couples').insert({
      user_a: user.id,
      invite_token: token,
      invite_expires_at: expiresAt,
      status: 'active',
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setInviteLink(`${baseUrl}/invite/${token}`);
    setWaitingForPartner(true);
    setCreating(false);
    toast.show('Invite link created!', 'success');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Join me on TwoOfUs', url: inviteLink });
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <Toast />

      <div className="relative z-10 w-full max-w-md text-center">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl text-on-surface mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {isRePairing ? 'Start fresh' : 'Invite your person'}
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xs mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            {isRePairing
              ? 'New connection, new encryption. Send them this link to begin.'
              : 'Send them this link. Once they join, your private space is created.'}
          </p>
        </header>

        {!inviteLink ? (
          <div className="flex flex-col gap-6">
            {isRePairing && needsPassword && (
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant" style={{ fontFamily: 'var(--font-label)' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="minimal-input"
                  placeholder="To encrypt your new keys"
                />
                <p className="text-[11px] text-outline mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                  New keys will be generated for this relationship
                </p>
              </div>
            )}
            <button onClick={createInvite} disabled={creating}
              className="btn-primary py-4 px-8 text-base w-full flex items-center justify-center gap-2 disabled:opacity-50">
              <span className="material-symbols-outlined">link</span>
              {creating ? 'Setting up...' : 'Generate Invite Link'}
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8">
            <div className="mb-6">
              <p className="text-[11px] tracking-widest uppercase text-on-surface-variant mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Secret Invite Link
              </p>
              <div className="flex items-center justify-between bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
                <span className="text-base text-on-surface truncate mr-3 blur-sm hover:blur-none focus:blur-none active:blur-none transition-all cursor-pointer" style={{ fontFamily: 'var(--font-mono)' }}>
                  {inviteLink.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={copyLink} className="btn-primary py-4 px-8 text-base w-full flex items-center justify-center gap-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button onClick={shareLink} className="py-4 px-8 text-base w-full rounded-full border border-white/6 text-on-surface flex items-center justify-center gap-2 hover:shadow-[inset_0_0_15px_rgba(255,178,189,0.2)] transition-all">
                <span className="material-symbols-outlined">ios_share</span>Share
              </button>
            </div>
            {waitingForPartner && (
              <p className="text-[11px] text-outline mt-8" style={{ fontFamily: 'var(--font-mono)' }}>
                Waiting for your partner to join...
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
