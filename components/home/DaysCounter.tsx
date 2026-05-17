'use client';

interface DaysCounterProps {
  pairedAt: string | null;
}

export default function DaysCounter({ pairedAt }: DaysCounterProps) {
  if (!pairedAt) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(pairedAt).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="text-center">
      <p className="text-7xl md:text-[96px] font-bold text-on-surface leading-none tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        {days}
      </p>
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-3" style={{ fontFamily: 'var(--font-label)' }}>
        {days === 0 ? "Today is your day! 🎉" : "Days Together"}
      </p>
    </div>
  );
}
