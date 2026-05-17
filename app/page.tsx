import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function SplashPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-secondary/8 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <div className="mb-8">
          <span className="text-7xl">💕</span>
        </div>
        <h1
          className="text-5xl md:text-7xl font-bold text-on-surface mb-4 tracking-tight"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          TwoOfUs
        </h1>
        <p className="text-lg text-on-surface-variant max-w-xs mb-12" style={{ fontFamily: 'var(--font-body)' }}>
          A private universe for two
        </p>
        <a
          href="/login"
          className="btn-primary py-4 px-12 text-lg inline-flex items-center gap-2"
        >
          Begin
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </a>
      </div>

      {/* Version */}
      <p className="absolute bottom-8 text-[11px] text-outline" style={{ fontFamily: 'var(--font-mono)' }}>
        v1.0.0 — encrypted with love
      </p>
    </main>
  );
}
