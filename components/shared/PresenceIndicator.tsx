'use client';

export default function PresenceIndicator({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        online
          ? 'bg-tertiary shadow-[0_0_8px_rgba(91,222,141,0.8)] animate-pulse'
          : 'bg-outline'
      }`}
    />
  );
}
