'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';

export default function TopBar() {
  const { partner } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 bg-surface/80 backdrop-blur-xl md:px-[120px]">
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
        <Link href="/call" className="text-primary hover:text-primary-fixed transition-colors">
          <span className="material-symbols-outlined">videocam</span>
        </Link>
      </div>
    </header>
  );
}
