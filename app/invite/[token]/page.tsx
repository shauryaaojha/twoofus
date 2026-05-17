'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { hasSessionKeys } from '@/lib/crypto/keyManager';

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'accepting' | 'error' | 'success'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const accept = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Store token and redirect to signup
        sessionStorage.setItem('invite_token', token);
        router.push('/signup');
        return;
      }

      // Check if user has keys set up in their database profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('encrypted_private_key')
        .eq('id', user.id)
        .single();

      if (!profile?.encrypted_private_key || !hasSessionKeys()) {
        sessionStorage.setItem('invite_token', token);
        router.push('/unlock');
        return;
      }

      setStatus('accepting');

      // Check if user already has an active relationship
      const { data: existingActive } = await supabase
        .from('couples').select('id')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .not('user_b', 'is', null)
        .eq('status', 'active')
        .single();

      if (existingActive) {
        setError('You are already in an active relationship.');
        setStatus('error');
        return;
      }

      // Find the invite (must be active and unclaimed)
      const { data: couple, error: findError } = await supabase
        .from('couples').select('*')
        .eq('invite_token', token)
        .is('user_b', null)
        .eq('status', 'active')
        .single();

      if (findError || !couple) {
        setError('Invite link is invalid, expired, or already used.');
        setStatus('error');
        return;
      }

      if (couple.user_a === user.id) {
        setError('You cannot pair with yourself.');
        setStatus('error');
        return;
      }

      // Check expiry
      if (couple.invite_expires_at && new Date(couple.invite_expires_at) < new Date()) {
        setError('This invite link has expired. Ask your partner to generate a new one.');
        setStatus('error');
        return;
      }

      // Accept: set user_b and paired_at, clear invite token
      const { data, error: updateError } = await supabase
        .from('couples').update({
          user_b: user.id,
          paired_at: new Date().toISOString(),
          invite_token: null,
          invite_expires_at: null,
        })
        .eq('id', couple.id)
        .select();

      if (updateError || !data || data.length === 0) {
        setError('Failed to pair. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setTimeout(() => router.push('/home'), 2000);
    };
    accept();
  }, [token, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tertiary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative z-10 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-6" />
            <p className="text-on-surface-variant">Loading invite...</p>
          </>
        )}
        {status === 'accepting' && (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-tertiary/30 border-t-tertiary animate-spin mx-auto mb-6" />
            <p className="text-on-surface text-xl" style={{ fontFamily: 'var(--font-headline)' }}>Creating your universe...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <span className="text-7xl block mb-6">💕</span>
            <h1 className="text-3xl font-bold text-on-surface mb-3" style={{ fontFamily: 'var(--font-display)' }}>You&apos;re paired!</h1>
            <p className="text-on-surface-variant">Redirecting to your home...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="text-5xl block mb-6">😔</span>
            <h1 className="text-2xl font-bold text-error mb-3">{error}</h1>
            <a href="/login" className="text-primary hover:text-primary-fixed transition-colors">Go to login →</a>
          </>
        )}
      </div>
    </main>
  );
}
