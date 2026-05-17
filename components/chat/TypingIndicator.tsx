'use client';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="glass-card rounded-[20px] rounded-bl-md px-5 py-3.5 flex items-center gap-1.5">
        <div className="typing-dot w-2 h-2 rounded-full bg-on-surface-variant/60" />
        <div className="typing-dot w-2 h-2 rounded-full bg-on-surface-variant/60" />
        <div className="typing-dot w-2 h-2 rounded-full bg-on-surface-variant/60" />
      </div>
    </div>
  );
}
