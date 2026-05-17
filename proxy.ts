import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession instead of getUser in middleware for faster edge execution
  // and to avoid local Windows Edge runtime fetch issues.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // Protect app routes
  const isAppRoute = request.nextUrl.pathname.startsWith('/home') ||
    request.nextUrl.pathname.startsWith('/chat') ||
    request.nextUrl.pathname.startsWith('/call') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/pair');

  // If public DB rows were reset while the auth cookie still exists, the app can
  // otherwise keep bouncing away from /login. Treat missing profile as stale auth.
  const isAuthRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';
  if (user && (isAppRoute || isAuthRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut({ scope: 'local' });
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('reason', 'session-reset');

      if (isAuthRoute) {
        const nextRes = NextResponse.next({ request });
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          nextRes.cookies.set(cookie.name, cookie.value, cookie);
        });
        return nextRes;
      }

      const redirectRes = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectRes.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectRes;
    }
  }

  if (isAppRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectRes = NextResponse.redirect(url);
    // Copy cookies from supabaseResponse to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectRes;
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    const redirectRes = NextResponse.redirect(url);
    // Copy cookies
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectRes;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|screens|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
