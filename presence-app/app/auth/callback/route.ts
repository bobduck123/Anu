import { NextRequest, NextResponse } from "next/server";
import { sanitizeReturnTo } from "@/lib/auth/returnTo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const returnTo = sanitizeReturnTo(
    url.searchParams.get("returnTo"),
    "/studio",
    url.origin,
  );
  const code = url.searchParams.get("code");

  if (!isSupabaseConfigured()) {
    const signInUrl = new URL("/auth/sign-in", url.origin);
    signInUrl.searchParams.set("returnTo", returnTo);
    signInUrl.searchParams.set("error", "auth_not_configured");
    return NextResponse.redirect(signInUrl);
  }

  if (!code) {
    const signInUrl = new URL("/auth/sign-in", url.origin);
    signInUrl.searchParams.set("returnTo", returnTo);
    signInUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(signInUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const signInUrl = new URL("/auth/sign-in", url.origin);
    signInUrl.searchParams.set("returnTo", returnTo);
    signInUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.redirect(new URL(returnTo, url.origin));
}
