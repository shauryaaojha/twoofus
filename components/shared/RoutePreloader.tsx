'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROUTES_TO_PRELOAD = ['/home', '/chat', '/call', '/profile', '/settings'];

export default function RoutePreloader() {
  const router = useRouter();

  useEffect(() => {
    const preload = () => {
      ROUTES_TO_PRELOAD.forEach((href) => router.prefetch(href));
    };
    const win = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(preload, { timeout: 1200 });
      return () => win.cancelIdleCallback?.(id);
    }

    const id = win.setTimeout(preload, 250);
    return () => win.clearTimeout(id);
  }, [router]);

  return null;
}
