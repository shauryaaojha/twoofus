'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/home', icon: 'home', label: 'Home' },
  { href: '/chat', icon: 'chat_bubble', label: 'Chat' },
  { href: '/call', icon: 'call', label: 'Call' },
  { href: '/profile', icon: 'person', label: 'Profile' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 backdrop-blur-xl border-t border-outline-variant/10 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] h-[80px] rounded-t-xl"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface-container) 80%, transparent)' }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={`flex flex-col items-center justify-center transition-all duration-300 ${
              isActive
                ? 'text-primary drop-shadow-[0_0_8px_rgba(255,178,184,0.6)] scale-110'
                : 'text-on-surface-variant hover:text-primary/80'
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
