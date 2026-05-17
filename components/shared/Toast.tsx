'use client';

import { useToastStore } from '@/lib/store/toastStore';

export default function Toast() {
  const { message, type, visible } = useToastStore();
  if (!visible) return null;

  const colors = {
    success: 'bg-tertiary/20 border-tertiary/40 text-tertiary',
    error: 'bg-error/20 border-error/40 text-error',
    info: 'bg-primary/20 border-primary/40 text-primary',
  };

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full border backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-[slideDown_0.3s_ease] ${colors[type]}`}>
      <p className="text-sm font-medium whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
        {message}
      </p>
    </div>
  );
}
