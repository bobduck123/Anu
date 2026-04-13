import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/supabase/middleware', () => ({
  updateSupabaseSession: vi.fn(),
}));

vi.mock('@/lib/runtime', () => ({
  getCoreApiOrigin: vi.fn(),
}));

import { proxy } from '@/proxy';
import { updateSupabaseSession } from '@/lib/supabase/middleware';
import { getCoreApiOrigin } from '@/lib/runtime';


describe('proxy tenant contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates the full tenant cookie contract from one domain resolution response', async () => {
    const supabaseResponse = NextResponse.next();

    vi.mocked(updateSupabaseSession).mockResolvedValue({
      supabaseResponse,
      user: null,
    });
    vi.mocked(getCoreApiOrigin).mockReturnValue('https://core.example.com');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            contract_version: '2026-04-10',
            node_id: 7,
            node_slug: 'au-nsw-sydney',
            node_name: 'Sydney Node',
            semantic_key: 'sydney-alpha',
            white_label: true,
            brand: {
              primary_color: '#112233',
              accent_color: '#445566',
              logo_url: 'https://cdn.example/logo.svg',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    const request = new NextRequest('https://impact.example.com/community', {
      headers: { host: 'impact.example.com' },
    });
    const response = await proxy(request);

    expect(response.headers.get('x-tenant-id')).toBe('7');
    expect(response.headers.get('x-tenant-slug')).toBe('au-nsw-sydney');
    expect(response.headers.get('x-tenant-name')).toBe('Sydney Node');
    expect(response.headers.get('x-tenant-white-label')).toBe('true');
    expect(response.headers.get('x-tenant-semantic-key')).toBe('sydney-alpha');

    expect(response.cookies.get('tenant_id')?.value).toBe('7');
    expect(response.cookies.get('tenant_slug')?.value).toBe('au-nsw-sydney');
    expect(decodeURIComponent(response.cookies.get('tenant_name')?.value || '')).toBe('Sydney Node');
    expect(response.cookies.get('tenant_white_label')?.value).toBe('true');
    expect(response.cookies.get('tenant_semantic_key')?.value).toBe('sydney-alpha');

    const brandCookie = response.cookies.get('tenant_brand')?.value;
    expect(brandCookie).toBeTruthy();
    const parsedBrand = JSON.parse(decodeURIComponent(brandCookie || '{}')) as Record<string, unknown>;
    expect(parsedBrand.primaryColor).toBe('#112233');
    expect(parsedBrand.accentColor).toBe('#445566');
    expect(parsedBrand.logoUrl).toBe('https://cdn.example/logo.svg');
  });
});
