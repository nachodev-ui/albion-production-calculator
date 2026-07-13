interface AccountAuthConfig {
  readonly enabled: boolean;
  readonly configured: boolean;
  readonly domain: string;
  readonly clientId: string;
  readonly audience: string;
  readonly scope: string;
  readonly centralApiBaseUrl: string;
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
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
  enabled: parseBoolean(import.meta.env["VITE_AUTH0_ENABLED"]),
  configured: domain.length > 0 && clientId.length > 0 && audience.length > 0,
  domain,
  clientId,
  audience,
  scope: (
    import.meta.env["VITE_AUTH0_SCOPE"] ?? "openid profile email"
  ).trim(),
  centralApiBaseUrl: normalizeBaseUrl(
    import.meta.env["VITE_CENTRAL_MARKET_API_URL"],
  ),
};
