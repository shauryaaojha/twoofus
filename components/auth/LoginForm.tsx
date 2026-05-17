'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { fetchAndDecryptKeys, generateAndUploadKeys } from '@/lib/crypto/keyManager';
import Link from 'next/link';
import OAuthButtons from './OAuthButtons';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = getSupabase();

    // 1. Authenticate
    setStatus('Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      setStatus('');
      return;
    }

    const userId = authData.user?.id;
    if (!userId) { setError('Login failed'); setLoading(false); return; }

    // 2. Fetch and decrypt E2EE private key using password
    setStatus('Restoring encryption keys...');
    const restored = await fetchAndDecryptKeys(supabase, userId, password);

    if (!restored) {
      // Legacy account or first device — generate and upload keys
      setStatus('Setting up encryption...');
      try {
        await generateAndUploadKeys(supabase, userId, password);
      } catch {
        setError('Failed to set up encryption.');
        setLoading(false);
        return;
      }
    }

    router.push('/home');
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
      {error && (
        <div className="text-error text-sm p-3 rounded-lg bg-error-container/20 border border-error/20">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant" style={{ fontFamily: 'var(--font-label)' }}>
          Email
        </label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="minimal-input" placeholder="you@example.com" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant" style={{ fontFamily: 'var(--font-label)' }}>
          Password
        </label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="minimal-input" placeholder="••••••••" required />
      </div>
      <button type="submit" disabled={loading}
        className="btn-primary py-4 px-8 text-base w-full mt-4 disabled:opacity-50">
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
