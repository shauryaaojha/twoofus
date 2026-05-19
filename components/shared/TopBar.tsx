'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { getSupabase } from '@/lib/supabase/client';
import { clearAllKeys } from '@/lib/crypto/keyManager';

export default function TopBar() {
  const { partner, reset } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    clearAllKeys();
    reset();
    router.push('/login');
  };

  return (
    <header 
      className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 backdrop-blur-xl md:px-[120px]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface) 80%, transparent)' }}
    >
      <div className="flex items-center gap-4">
        {partner?.avatar_url ? (
          <img
            src={partner.avatar_url}
            alt={partner.display_name}
            className="w-8 h-8 rounded-full object-cover presence-glow"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
            <span className="text-on-primary-container text-sm font-bold">
              {partner?.display_name?.[0] || '♥'}
            </span>
          </div>
        )}
        <h1 className="font-headline text-2xl font-medium text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
          Us
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/chat" aria-label="Open chat" className="text-primary hover:text-primary-fixed transition-colors">
          <span className="material-symbols-outlined">chat</span>
        </Link>
        <Link href="/call" aria-label="Start call" className="text-primary hover:text-primary-fixed transition-colors">
          <span className="material-symbols-outlined">videocam</span>
        </Link>
        <Link href="/profile" aria-label="View profile" className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">account_circle</span>
        </Link>
        <Link href="/settings" aria-label="Open settings" className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}
