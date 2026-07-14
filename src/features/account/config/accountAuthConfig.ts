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
  fallback: Auth0CacheLocation = "memory",
): Auth0CacheLocation {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "localstorage") return "localstorage";
  if (normalized === "memory") return "memory";
  return fallback;
}

export function buildAuth0Scope(
  value: string | undefined,
  useRefreshTokens: boolean,
): string {
  const scopes = new Set(
    (value?.trim() || "openid profile email read:account")
      .split(/\s+/)
      .filter(Boolean),
  );
  if (useRefreshTokens) scopes.add("offline_access");
  return [...scopes].join(" ");
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
const useRefreshTokens = parseAuth0Boolean(
  import.meta.env["VITE_AUTH0_SESSION_REFRESH_ENABLED"],
  true,
);

export const accountAuthConfig: AccountAuthConfig = {
  enabled: parseAuth0Boolean(import.meta.env["VITE_AUTH0_ENABLED"]),
  configured: domain.length > 0 && clientId.length > 0 && audience.length > 0,
  billingEnabled: parseAuth0Boolean(import.meta.env["VITE_BILLING_ENABLED"]),
  domain,
  clientId,
  audience,
  scope: buildAuth0Scope(import.meta.env["VITE_AUTH0_SCOPE"], useRefreshTokens),
  cacheLocation: parseAuth0CacheLocation(
    import.meta.env["VITE_AUTH0_CACHE_LOCATION"],
    "localstorage",
  ),
  useRefreshTokens,
  useRefreshTokensFallback: parseAuth0Boolean(
    import.meta.env["VITE_AUTH0_SESSION_FALLBACK_ENABLED"],
    true,
  ),
  centralApiBaseUrl: normalizeBaseUrl(
    import.meta.env["VITE_CENTRAL_MARKET_API_URL"],
  ),
};
