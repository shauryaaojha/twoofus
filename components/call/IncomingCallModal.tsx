'use client';

interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({ callerName, callerAvatar, onAccept, onDecline }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center">
      {/* Avatar with pulse rings */}
      <div className="relative flex items-center justify-center mb-20">
        <div className="pulse-ring" />
        <div className="pulse-ring" />
        <div className="pulse-ring" />
        <div className="relative z-10 w-[120px] h-[120px] rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,178,184,0.3)] border-2 border-primary/20">
          {callerAvatar ? (
            <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-container flex items-center justify-center">
              <span className="text-4xl text-on-primary-container font-bold">{callerName[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-2 mb-[120px]">
        <h1 className="text-3xl md:text-5xl font-semibold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
          {callerName} is calling...
        </h1>
        <p className="text-lg text-on-surface-variant/80">Voice Call</p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-16">
        <button
          onClick={onDecline}
          className="w-[72px] h-[72px] rounded-full bg-error-container hover:bg-error-container/80 text-on-error flex items-center justify-center shadow-[0_0_15px_rgba(147,0,10,0.3)] transition-all duration-300"
        >
          <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>call_end</span>
        </button>
        <button
          onClick={onAccept}
          className="w-[72px] h-[72px] rounded-full bg-tertiary-container hover:bg-tertiary-container/80 text-on-tertiary-container flex items-center justify-center shadow-[0_0_15px_rgba(4,166,92,0.3)] transition-all duration-300"
        >
          <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
        </button>
      </div>
    </div>
  );
}
