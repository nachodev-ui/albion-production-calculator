import type { AccountAccess, EntitlementValue } from "../types";

export const ACCOUNT_ACCESS_SESSION_CACHE_KEY =
  "albion-production-calculator:account-access-session:v1";
export const ACCOUNT_ACCESS_SESSION_CACHE_MAX_AGE_MS = 30 * 60 * 1000;

interface StoredAccountAccessSession {
  readonly version: 1;
  readonly subject: string;
  readonly syncedAt: string;
  readonly access: AccountAccess;
}

export interface CachedAccountAccess {
  readonly access: AccountAccess;
  readonly syncedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isEntitlementValue(value: unknown): value is EntitlementValue {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

function parseAccess(value: unknown): AccountAccess | null {
  if (!isRecord(value)) return null;

  const user = value["user"];
  const subscription = value["subscription"];
  const entitlements = value["entitlements"];

  if (!isRecord(user) || !isRecord(subscription) || !isRecord(entitlements)) {
    return null;
  }

  if (
    !isNonEmptyString(user["id"]) ||
    !isNullableString(user["email"]) ||
    !isNullableString(user["displayName"]) ||
    !isNonEmptyString(user["createdAt"]) ||
    !isNonEmptyString(user["updatedAt"]) ||
    !isNullableString(user["lastLoginAt"]) ||
    !isNonEmptyString(subscription["plan"]) ||
    !isNonEmptyString(subscription["status"]) ||
    !isNullableString(subscription["accessUntil"])
  ) {
    return null;
  }

  const parsedEntitlements: Record<string, EntitlementValue> = {};
  for (const [key, entitlementValue] of Object.entries(entitlements)) {
    if (!isEntitlementValue(entitlementValue)) return null;
    parsedEntitlements[key] = entitlementValue;
  }

  return {
    user: {
      id: user["id"],
      email: user["email"],
      displayName: user["displayName"],
      createdAt: user["createdAt"],
      updatedAt: user["updatedAt"],
      lastLoginAt: user["lastLoginAt"],
    },
    subscription: {
      plan: subscription["plan"],
      status: subscription["status"],
      accessUntil: subscription["accessUntil"],
    },
    entitlements: parsedEntitlements,
  };
}

export function serializeAccountAccessSession(
  subject: string,
  access: AccountAccess,
  syncedAt: string,
): string {
  const payload: StoredAccountAccessSession = {
    version: 1,
    subject,
    syncedAt,
    access,
  };
  return JSON.stringify(payload);
}

export function deserializeAccountAccessSession(
  raw: string,
  subject: string,
  now = Date.now(),
): CachedAccountAccess | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value["version"] !== 1 ||
      value["subject"] !== subject ||
      !isNonEmptyString(value["syncedAt"])
    ) {
      return null;
    }

    const syncedAtMs = Date.parse(value["syncedAt"]);
    const ageMs = now - syncedAtMs;
    if (
      !Number.isFinite(syncedAtMs) ||
      ageMs < -60_000 ||
      ageMs > ACCOUNT_ACCESS_SESSION_CACHE_MAX_AGE_MS
    ) {
      return null;
    }

    const access = parseAccess(value["access"]);
    return access ? { access, syncedAt: value["syncedAt"] } : null;
  } catch {
    return null;
  }
}

export function loadAccountAccessSession(
  subject: string,
): CachedAccountAccess | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(ACCOUNT_ACCESS_SESSION_CACHE_KEY);
    if (!raw) return null;

    const cached = deserializeAccountAccessSession(raw, subject);
    if (!cached) {
      window.sessionStorage.removeItem(ACCOUNT_ACCESS_SESSION_CACHE_KEY);
    }
    return cached;
  } catch {
    return null;
  }
}

export function saveAccountAccessSession(
  subject: string,
  access: AccountAccess,
  syncedAt: string,
): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      ACCOUNT_ACCESS_SESSION_CACHE_KEY,
      serializeAccountAccessSession(subject, access, syncedAt),
    );
  } catch {
    // La sesión sigue funcionando aunque el navegador bloquee sessionStorage.
  }
}

export function clearAccountAccessSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ACCOUNT_ACCESS_SESSION_CACHE_KEY);
  } catch {
    // No se debe impedir el cierre de sesión por un fallo de almacenamiento.
  }
}
