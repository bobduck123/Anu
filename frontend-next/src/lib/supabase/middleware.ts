import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, warnMissingSupabaseConfig } from './config';

/**
 * Updates the Supabase session by refreshing tokens.
 * Call this from middleware to keep auth sessions alive.
 *
 * IMPORTANT: With Fluid compute, always create a new client on each request.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!isSupabaseConfigured()) {
    warnMissingSupabaseConfig('middleware');
    return { supabaseResponse, user: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  // A simple mistake could make it very hard to debug issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
