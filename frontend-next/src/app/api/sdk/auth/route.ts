import { NextRequest, NextResponse } from 'next/server';
import { getCoreApiBase } from '@/lib/runtime';

/**
 * SDK Token Exchange Endpoint
 *
 * POST /api/sdk/auth
 * Body: { api_key: string }
 *
 * Exchanges an SDK API key for a short-lived JWT by proxying to the backend.
 * In production, this would validate the SDK key against a registered set.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = body.api_key;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'api_key required' }, { status: 400 });
    }

    const apiBase = getCoreApiBase({ server: true });

    // Proxy to backend auth — in a real implementation this would use a
    // dedicated SDK auth endpoint with API key validation.
    // For the demo, we pass through to the standard auth endpoint.
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: body.username || 'sdk_user',
        password: body.password || apiKey,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { ok: false, error: data.message || 'Authentication failed' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      data: {
        token: data.access_token,
        expires_in: 3600,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
