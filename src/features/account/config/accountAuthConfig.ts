export type Auth0CacheLocation = "memory" | "localstorage";

interface AccountAuthConfig {
  readonly enabled: boolean;
  readonly configured: boolean;
  readonly billingEnabled: boolean;
  readonly domain: string;
  readonly clientId: string;
  readonly audience: string;
  readonly scope: string;
  readonly cacheLocation: Auth0CacheLocation;
  readonly useRefreshTokens: boolean;
  readonly useRefreshTokensFallback: boolean;
  readonly centralApiBaseUrl: string;
}

export function parseAuth0Boolean(
  value: string | undefined,
  fallback = false,
): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

export function parseAuth0CacheLocation(
  value: string | undefined,
): Auth0CacheLocation {
  return value?.trim().toLowerCase() === "localstorage"
    ? "localstorage"
    : "memory";
}

function normalizeDomain(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

function normalizeBaseUrl(value: string | undefined): string {
  const fallback = "http://127.0.0.1:8080/api/v1";
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

const domain = normalizeDomain(import.meta.env["VITE_AUTH0_DOMAIN"]);
const clientId = (import.meta.env["VITE_AUTH0_CLIENT_ID"] ?? "").trim();
const audience = (import.meta.env["VITE_AUTH0_AUDIENCE"] ?? "").trim();

export const accountAuthConfig: AccountAuthConfig = {
  enabled: parseAuth0Boolean(import.meta.env["VITE_AUTH0_ENABLED"]),
  configured: domain.length > 0 && clientId.length > 0 && audience.length > 0,
  billingEnabled: parseAuth0Boolean(import.meta.env["VITE_BILLING_ENABLED"]),
  domain,
  clientId,
  audience,
  scope: (
    import.meta.env["VITE_AUTH0_SCOPE"] ??
    "openid profile email offline_access read:account"
  ).trim(),
  cacheLocation: parseAuth0CacheLocation(
    import.meta.env["VITE_AUTH0_CACHE_LOCATION"],
  ),
  useRefreshTokens: parseAuth0Boolean(
    import.meta.env["VITE_AUTH0_USE_REFRESH_TOKENS"],
  ),
  useRefreshTokensFallback: parseAuth0Boolean(
    import.meta.env["VITE_AUTH0_USE_REFRESH_TOKENS_FALLBACK"],
  ),
  centralApiBaseUrl: normalizeBaseUrl(
    import.meta.env["VITE_CENTRAL_MARKET_API_URL"],
  ),
};
