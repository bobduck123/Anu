# Root Cause

## Confirmed Hosted Failure

After successful login, the hosted editor generated a request to:

`/auth/sign-out?_rsc=...`

The response cleared Supabase authentication cookies. Subsequent owner routes were then gated because the authenticated browser session had genuinely been destroyed.

## Source Trace

Two owner-visible surfaces rendered a Next `Link` to the destructive route:

- `components/studio/StudioShell.tsx`
- `app/(studio)/studio/page.tsx`

The route handler at `app/auth/sign-out/route.ts` implemented:

```ts
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
```

That contract is unsafe in an App Router application. A GET target rendered as `Link` may be fetched by route prefetch or RSC navigation without the user clicking it. Since the GET handler mutated cookies, prefetch was functionally a logout.

## Classification

Root cause: destructive authentication mutation exposed through an automatically fetchable GET/RSC navigation target.

This supersedes cold-start/session-race hypotheses as the primary hosted blocker for the observed cookie clearing event.
