'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { fetchAndDecryptKeys, generateAndUploadKeys, hasSessionKeys } from '@/lib/crypto/keyManager';
import { useAuthStore } from '@/lib/store/authStore';

export default function UnlockPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState<'unlock' | 'setup'>('unlock');
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const checkState = async () => {
      if (hasSessionKeys()) {
        router.push('/home');
        return;
      }
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser({ id: user.id, email: user.email || '' });
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('encrypted_private_key')
        .eq('id', user.id)
        .single();
        
      if (!profile?.encrypted_private_key) {
        setMode('setup');
      }
    };
    checkState();
  }, [router, setUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 6) { setError('PIN/Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    try {
      if (mode === 'setup') {
        setStatus('Setting up encryption...');
        await generateAndUploadKeys(supabase, user.id, pin);
      } else {
        setStatus('Decrypting keys...');
        const restored = await fetchAndDecryptKeys(supabase, user.id, pin);
        if (!restored) {
          setError('Incorrect PIN or Password.');
          setLoading(false);
          setStatus('');
          return;
        }
      }
      
      router.push('/home');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-6 sm:p-8 bg-background text-on-background relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-sm z-10 flex flex-col gap-8 animate-fade-in">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 bg-surface-variant/50 backdrop-blur-md rounded-3xl flex items-center justify-center border border-outline/10 shadow-glass mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold font-heading text-on-background">
            {mode === 'setup' ? 'Secure Your Messages' : 'Unlock Messages'}
          </h1>
          <p className="text-sm text-on-surface-variant font-mono">
            {mode === 'setup' 
              ? 'Create a 6-digit PIN to encrypt your private data. You will need this on new devices.' 
              : 'Enter your Encryption PIN (or your account password if you signed up with email) to decrypt your messages.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          {error && (
            <div className="text-error text-sm p-3 rounded-lg bg-error-container/20 border border-error/20">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant" style={{ fontFamily: 'var(--font-label)' }}>
              Encryption PIN / Password
            </label>
            <input 
              type="password" 
              value={pin} 
              onChange={(e) => setPin(e.target.value)}
              className="minimal-input" 
              placeholder="••••••" 
              required 
              minLength={6} 
            />
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary py-4 px-8 text-base w-full mt-4 disabled:opacity-50">
            {loading ? status || 'Processing...' : (mode === 'setup' ? 'Save PIN' : 'Unlock')}
          </button>
        </form>
      </div>
    </div>
  );
}
