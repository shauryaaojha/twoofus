'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
      <h2 className="text-2xl font-medium text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
        TwoOfUs
      </h2>
      <p className="text-sm text-on-surface-variant mt-2">Loading your universe...</p>
    </div>
  );
}
