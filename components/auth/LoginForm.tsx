'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { clearAllKeys } from '@/lib/crypto/keyManager';
import Link from 'next/link';
import OAuthButtons from './OAuthButtons';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionWasReset = searchParams.get('reason') === 'session-reset';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('Signing in...');

    clearAllKeys();
    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      setStatus('');
      return;
    }

    if (!authData.user?.id) {
      setError('Login failed');
      setLoading(false);
      setStatus('');
      return;
    }

    const userId = authData.user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      const metadata = authData.user.user_metadata ?? {};
      const displayName =
        metadata.display_name ||
        metadata.full_name ||
        metadata.name ||
        authData.user.email?.split('@')[0] ||
        'You';

      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        display_name: displayName,
        avatar_url: metadata.avatar_url || metadata.picture || null,
        mood: '🥰',
      });

      if (profileError) {
        setError('Signed in, but profile setup failed. Please try again.');
        setLoading(false);
        setStatus('');
        return;
      }
    }

    setStatus('Opening PIN setup...');
    router.push('/unlock');
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
      {error && (
        <div className="text-error text-sm p-3 rounded-lg bg-error-container/20 border border-error/20">
          {error}
        </div>
      )}
      {sessionWasReset && !error && (
        <div className="text-tertiary text-sm p-3 rounded-lg bg-tertiary-container/20 border border-tertiary/20">
          Session reset after database cleanup. Please sign in again.
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant" style={{ fontFamily: 'var(--font-label)' }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="minimal-input"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant" style={{ fontFamily: 'var(--font-label)' }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="minimal-input"
          placeholder="Password"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary py-4 px-8 text-base w-full mt-4 disabled:opacity-50">
        {loading ? status || 'Signing in...' : 'Sign In'}
      </button>

      <div className="flex items-center gap-4 my-2 w-full">
        <div className="flex-1 h-px bg-outline/20"></div>
        <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Or</span>
        <div className="flex-1 h-px bg-outline/20"></div>
      </div>

      <OAuthButtons />

      <p className="text-center text-sm text-on-surface-variant">
        No account?{' '}
        <Link href="/signup" className="text-primary hover:text-primary-fixed transition-colors">Create one</Link>
      </p>
    </form>
  );
}
