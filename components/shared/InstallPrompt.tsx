'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isInStandalone) return;

    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(ios);

    // Show after 2 seconds
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-5 mt-4 flex flex-col items-center pointer-events-none">
      <div className="glass-panel w-full max-w-[1100px] rounded-full p-2 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] pointer-events-auto">
        <div className="flex items-center gap-3 w-full">
          <button onClick={() => setShow(false)} className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-full flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden bg-primary-container flex items-center justify-center">
            <span className="text-on-primary-container font-bold text-lg">💕</span>
          </div>
          <div className="flex flex-col flex-grow min-w-0 justify-center">
            <span className="text-base text-on-surface truncate tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>Install TwoOfUs</span>
            <span className="text-sm text-on-surface-variant truncate opacity-80">Add to your home screen</span>
          </div>
          <button
            onClick={() => setShow(false)}
            className="btn-primary px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mr-1 flex-shrink-0"
          >
            Install
          </button>
        </div>
      </div>
      {isIos && (
        <div className="mt-6 flex flex-col items-center gap-2 animate-float pointer-events-none">
          <p className="text-sm text-primary-fixed drop-shadow-[0_0_8px_rgba(255,178,184,0.4)]">Tap Share below</p>
          <span className="material-symbols-outlined text-primary-fixed text-[32px] drop-shadow-[0_0_8px_rgba(255,178,184,0.6)]">arrow_downward</span>
        </div>
      )}
    </div>
  );
}
