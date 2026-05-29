'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { clearAllKeys, fetchAndDecryptKeys, generateAndUploadKeys, hasSessionKeys } from '@/lib/crypto/keyManager';
import { useAuthStore } from '@/lib/store/authStore';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const OTPInput = ({ value, onChange, disabled, autoFocus }: OTPInputProps) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputs.current[0]) {
      inputs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) return;

    const newPin = value.padEnd(6, ' ').split('');
    newPin[index] = val.substring(val.length - 1);
    const result = newPin.join('').replace(/\s/g, '');
    onChange(result);

    if (index < 5 && val) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newPin = value.padEnd(6, ' ').split('');
      if (newPin[index] !== ' ') {
        newPin[index] = ' ';
        onChange(newPin.join('').replace(/\s+$/, ''));
      } else if (index > 0) {
        newPin[index - 1] = ' ';
        onChange(newPin.join('').replace(/\s+$/, ''));
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, 5);
      inputs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center w-full" dir="ltr">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          disabled={disabled}
          autoComplete="one-time-code"
          className="w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl bg-surface-variant/50 border border-outline/20 rounded-xl focus:border-primary focus:bg-surface focus:outline-none transition-all font-mono"
        />
      ))}
    </div>
  );
};

export default function UnlockPage() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState<'unlock' | 'setup'>('unlock');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const checkState = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        clearAllKeys();
        router.push('/login');
        return;
      }
      setUser({ id: user.id, email: user.email || '' });
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('encrypted_private_key')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        clearAllKeys();
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        router.push('/login?reason=session-reset');
        return;
      }
        
      if (!profile?.encrypted_private_key) {
        clearAllKeys();
        setMode('setup');
        return;
      }

      if (hasSessionKeys()) {
        router.push('/home');
      }
    };
    checkState();
  }, [router, setUser]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (mode === 'setup') {
      if (step === 'enter') {
        if (pin.length < 6) { setError('PIN must be 6 digits'); return; }
        setStep('confirm');
        setError('');
        return;
      } else if (step === 'confirm') {
        if (confirmPin.length < 6) return;
        if (pin !== confirmPin) {
          setError('PINs do not match. Please try again.');
          setConfirmPin('');
          setStep('enter');
          setPin('');
          return;
        }
      }
    } else {
      if (pin.length < 6) { setError('PIN must be 6 digits'); return; }
    }

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
          setError('Incorrect PIN.');
          setLoading(false);
          setStatus('');
          setPin('');
          return;
        }
      }
      
      const inviteToken = sessionStorage.getItem('invite_token');
      if (inviteToken) {
        sessionStorage.removeItem('invite_token');
        router.push(`/invite/${inviteToken}`);
      } else {
        router.push('/home');
        router.refresh();
      }
    } catch {
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
          <p className="text-sm text-on-surface-variant font-mono px-2">
            {mode === 'setup' 
              ? (step === 'enter' ? 'Create a 6-digit PIN to encrypt your private data. You will need this on new devices.' : 'Confirm your 6-digit PIN to ensure it is correct.')
              : 'Enter your 6-digit Encryption PIN to decrypt your messages.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-8 items-center">
          {error && (
            <div className="w-full text-error text-sm p-3 rounded-lg bg-error-container/20 border border-error/20 text-center animate-fade-in">
              {error}
            </div>
          )}
          
          <div className="flex flex-col gap-3 w-full">
            <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant text-center" style={{ fontFamily: 'var(--font-label)' }}>
              {mode === 'setup' && step === 'confirm' ? 'Confirm PIN' : 'Enter PIN'}
            </label>
            
            {mode === 'setup' && step === 'confirm' ? (
              <OTPInput 
                value={confirmPin} 
                onChange={setConfirmPin} 
                disabled={loading} 
                autoFocus 
              />
            ) : (
              <OTPInput 
                value={pin} 
                onChange={setPin} 
                disabled={loading || (mode === 'setup' && step === 'confirm')} 
                autoFocus 
              />
            )}
          </div>
          
          <button type="submit" disabled={loading || (mode === 'setup' && step === 'confirm' ? confirmPin.length < 6 : pin.length < 6)}
            className="btn-primary py-4 px-8 text-base w-full disabled:opacity-50 transition-all">
            {loading ? status || 'Processing...' : (mode === 'setup' ? (step === 'enter' ? 'Next' : 'Save PIN') : 'Unlock')}
          </button>
          
          {mode === 'setup' && step === 'confirm' && !loading && (
             <button type="button" onClick={() => { setStep('enter'); setConfirmPin(''); }} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
               Go Back
             </button>
          )}
        </form>
      </div>
    </div>
  );
}
