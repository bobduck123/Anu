function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

type BaseOptions = {
  server?: boolean;
};

function resolveServerSiteUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${trimTrailingSlash(vercelUrl)}`;
  }

  return null;
}

function getExplicitOrigin(
  serverValue: string | undefined,
  explicitValue: string | undefined,
): string | null {
  if (serverValue && serverValue.trim()) {
    return trimTrailingSlash(serverValue.trim());
  }

  if (explicitValue && explicitValue.trim()) {
    return trimTrailingSlash(explicitValue.trim());
  }

  return null;
}

function resolveBase(
  explicitValue: string | undefined,
  serverValue: string | undefined,
  productionProxyPath: string,
  developmentFallback: string,
  options: BaseOptions = {},
): string {
  if (explicitValue && explicitValue.trim()) {
    return trimTrailingSlash(explicitValue.trim());
  }

  if (options.server && serverValue && serverValue.trim()) {
    return trimTrailingSlash(serverValue.trim());
  }

  if (options.server) {
    const siteUrl = resolveServerSiteUrl();
    if (siteUrl) {
      return `${siteUrl}${productionProxyPath}`;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return productionProxyPath;
  }

  return developmentFallback;
}

export function getCoreApiBase(options: BaseOptions = {}): string {
  return resolveBase(
    process.env.NEXT_PUBLIC_API_BASE,
    process.env.CORE_API_ORIGIN || process.env.BACKEND_ORIGIN,
    '/_core',
    'http://localhost:5000',
    options,
  );
}

export function getCoreApiOrigin(): string | null {
  return getExplicitOrigin(
    process.env.CORE_API_ORIGIN || process.env.BACKEND_ORIGIN,
    process.env.NEXT_PUBLIC_API_BASE,
  );
}

export function getImpactApiBase(options: BaseOptions = {}): string {
  return resolveBase(
    process.env.NEXT_PUBLIC_IMPACT_API_BASE,
    process.env.IMPACT_API_ORIGIN,
    '/_impact',
    'http://localhost:5003',
    options,
  );
}

export function getMemeticsApiBase(options: BaseOptions = {}): string {
  return resolveBase(
    process.env.NEXT_PUBLIC_MEMETICS_API_BASE,
    process.env.MEMETICS_API_ORIGIN || process.env.IMPACT_API_ORIGIN,
    '/_impact',
    'http://localhost:5003',
    options,
  );
}

export function getImpactApiOrigin(): string | null {
  const explicit =
    process.env.IMPACT_API_ORIGIN
    || process.env.MEMETICS_API_ORIGIN
    || '';
  if (explicit.trim()) {
    return trimTrailingSlash(explicit.trim());
  }

  const publicOrigin =
    process.env.NEXT_PUBLIC_IMPACT_API_BASE
    || process.env.NEXT_PUBLIC_MEMETICS_API_BASE
    || '';
  if (publicOrigin.trim().startsWith('http://') || publicOrigin.trim().startsWith('https://')) {
    return trimTrailingSlash(publicOrigin.trim());
  }

  return null;
}
