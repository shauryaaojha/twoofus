import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/unlock';

  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    next = '/unlock';
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in server components
            }
          },
        },
      }
    );
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const metadata = user.user_metadata ?? {};
        const displayName =
          metadata.full_name ||
          metadata.name ||
          user.email?.split('@')[0] ||
          'You';
        const avatarUrl = metadata.avatar_url || metadata.picture || null;

        await supabase.from('profiles').upsert({
          id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        });
      }

      // Using origin ensures cookies are preserved on the exact domain the user accessed
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=OAuthFailed`);
}
