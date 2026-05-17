import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-5xl mb-4 block">💕</span>
          <h1
            className="text-4xl md:text-5xl font-bold text-on-surface mb-3"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Welcome Back
          </h1>
          <p className="text-base text-on-surface-variant" style={{ fontFamily: 'var(--font-body)' }}>
            Sign in to your private space
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-2xl p-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
