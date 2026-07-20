const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string): string {
  const candidate = value.trim() || LOCAL_SITE_URL;
  const withProtocol = candidate.startsWith("http://") || candidate.startsWith("https://")
    ? candidate
    : `https://${candidate}`;
  const url = new URL(withProtocol);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      LOCAL_SITE_URL,
  );
}

function getSiteRouteUrl(pathname: string): URL {
  return new URL(pathname, `${getSiteUrl()}/`);
}

export function getAuthCallbackUrl(returnTo: string): string {
  const url = getSiteRouteUrl("/auth/callback");
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function getPasswordRecoveryUrl(): string {
  return getSiteRouteUrl("/auth/update-password").toString();
}
