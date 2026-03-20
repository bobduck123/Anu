import { NextRequest, NextResponse } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/middleware';
import { getCoreApiOrigin } from '@/lib/runtime';

/**
 * Multi-tenant white-label middleware for domain-based tenant resolution
 * with integrated Supabase authentication.
 * 
 * This middleware:
 * 1. Refreshes Supabase auth session tokens
 * 2. Resolves tenant/node from custom domains or subdomains
 * 3. Sets tenant context headers for downstream use
 * 4. Handles tenant-specific routing for white-label sites
 */

// Cache for domain-to-tenant mappings (in-memory, refreshed on cold start)
const tenantCache = new Map<string, TenantInfo>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

interface TenantInfo {
  nodeId: number;
  nodeSlug: string;
  nodeName: string;
  isWhiteLabel: boolean;
  brandConfig?: {
    primaryColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
}

// Platform domains that should use default routing
const PLATFORM_DOMAINS = [
  'anu.eco',
  'www.anu.eco',
  'app.anu.eco',
  'staging.anu.eco',
  'localhost',
  '127.0.0.1',
  'local',
];

function isPlatformDomain(hostname: string): boolean {
  return PLATFORM_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

function isVercelPreviewDomain(hostname: string): boolean {
  return hostname.endsWith('.vercel.app') || hostname.endsWith('.vercel.sh');
}

function isLocalDevelopmentHostname(hostname: string): boolean {
  if (hostname === 'local' || hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
    return true;
  }

  if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
    return true;
  }

  if (hostname === '::1') {
    return true;
  }

  return process.env.NODE_ENV !== 'production' && !hostname.includes('.');
}

async function resolveTenantFromDomain(
  hostname: string,
  apiBase: string
): Promise<TenantInfo | null> {
  // Check cache first
  const cached = tenantCache.get(hostname);
  const cacheTime = cacheTimestamps.get(hostname);
  if (cached && cacheTime && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const response = await fetch(
      `${apiBase}/api/domains/resolve?domain=${encodeURIComponent(hostname)}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Forwarded-Host': hostname,
        },
        // Short timeout for middleware
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      console.warn(`[middleware] Domain resolution failed for ${hostname}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.node_id) {
      return null;
    }

    const tenantInfo: TenantInfo = {
      nodeId: data.node_id,
      nodeSlug: data.node_slug || '',
      nodeName: data.node_name || '',
      isWhiteLabel: data.is_white_label || false,
      brandConfig: data.brand_config,
    };

    // Update cache
    tenantCache.set(hostname, tenantInfo);
    cacheTimestamps.set(hostname, Date.now());

    return tenantInfo;
  } catch (error) {
    const prefix = `[middleware] Error resolving domain ${hostname}`;
    if (process.env.NODE_ENV === 'production') {
      console.error(prefix, error);
    } else {
      console.warn(prefix, error instanceof Error ? error.message : error);
    }
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const requestHost = request.headers.get('host') || request.nextUrl.host;
  const hostname = request.nextUrl.hostname || requestHost.split(':')[0];
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Static files with extensions
  ) {
    return NextResponse.next();
  }

  // Update Supabase session first (refreshes auth tokens)
  const { supabaseResponse } = await updateSupabaseSession(request);

  // Skip tenant resolution for platform domains and Vercel preview deployments
  if (isPlatformDomain(hostname) || isVercelPreviewDomain(hostname) || isLocalDevelopmentHostname(hostname)) {
    return supabaseResponse;
  }

  // This is a custom domain - resolve tenant
  const apiBase = getCoreApiOrigin();
  if (!apiBase) {
    console.warn('[middleware] CORE_API_ORIGIN is not configured; skipping custom-domain tenant resolution.');
    return supabaseResponse;
  }

  const tenantInfo = await resolveTenantFromDomain(hostname, apiBase);

  if (!tenantInfo) {
    // Domain not configured - redirect to main platform
    return NextResponse.redirect(new URL('https://anu.eco', request.url));
  }

  // Use the Supabase response (preserves cookies) and add tenant headers
  const response = supabaseResponse;

  // Set tenant context headers for use in RSC and client components
  response.headers.set('x-tenant-id', String(tenantInfo.nodeId));
  response.headers.set('x-tenant-slug', tenantInfo.nodeSlug);
  response.headers.set('x-tenant-name', tenantInfo.nodeName);
  response.headers.set('x-tenant-white-label', String(tenantInfo.isWhiteLabel));

  // Set brand config as JSON header for theming
  if (tenantInfo.brandConfig) {
    response.headers.set(
      'x-tenant-brand',
      JSON.stringify(tenantInfo.brandConfig)
    );
  }

  // Set cookie for client-side access (HTTP-only for security)
  response.cookies.set('tenant_id', String(tenantInfo.nodeId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
