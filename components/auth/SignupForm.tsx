'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { generateAndUploadKeys } from '@/lib/crypto/keyManager';
import Link from 'next/link';
import OAuthButtons from './OAuthButtons';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    const supabase = getSupabase();

    // 1. Sign up
    setStatus('Creating account...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });

    if (authError || !authData.user) {
      setError(authError?.message || 'Signup failed');
      setLoading(false);
      setStatus('');
      return;
    }

    // 2. Generate E2EE keypair + encrypt with password + upload
    setStatus('Setting up encryption...');
    try {
      await generateAndUploadKeys(supabase, authData.user.id, password);
    } catch (err) {
      setError('Failed to set up encryption. Please try again.');
      setLoading(false);
      setStatus('');
      return;
    }

    // 3. Create profile with name and mood
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      display_name: name,
      mood: '🥰',
    });

    // 4. Check if there's a pending invite token from sessionStorage
    const pendingToken = sessionStorage.getItem('invite_token');
    if (pendingToken) {
      sessionStorage.removeItem('invite_token');
      router.push(`/invite/${pendingToken}`);
    } else {
      router.push('/pair');
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSignup} className="w-full flex flex-col gap-6">
      {error && (
        <div className="text-error text-sm p-3 rounded-lg bg-error-container/20 border border-error/20">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant" style={{ fontFamily: 'var(--font-label)' }}>
          Your Name
        </label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="minimal-input" placeholder="What they call you" required />
      </div>
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
          className="minimal-input" placeholder="At least 8 characters" required minLength={8} />
        <p className="text-[11px] text-outline mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          Also used to encrypt your private key — remember it!
        </p>
      </div>
      <button type="submit" disabled={loading}
        className="btn-primary py-4 px-8 text-base w-full mt-4 disabled:opacity-50">
        {loading ? status || 'Creating...' : 'Create Account'}
      </button>
      
      <div className="flex items-center gap-4 my-2 w-full">
        <div className="flex-1 h-px bg-outline/20"></div>
        <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Or</span>
        <div className="flex-1 h-px bg-outline/20"></div>
      </div>
      
      <OAuthButtons />
      <p className="text-center text-sm text-on-surface-variant">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:text-primary-fixed transition-colors">Sign in</Link>
      </p>
    </form>
  );
}
