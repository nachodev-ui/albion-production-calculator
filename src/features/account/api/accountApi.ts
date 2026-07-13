import { accountAuthConfig } from "../config/accountAuthConfig";
import type {
  AccountAccess,
  AccountSubscription,
  AccountUser,
  EntitlementMap,
  EntitlementValue,
} from "../types";

export class AccountApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AccountApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AccountApiError(`Invalid account field: ${field}`, 502);
  }
  return value;
}

function parseUser(value: unknown): AccountUser {
  if (!isRecord(value)) {
    throw new AccountApiError("Invalid account user response", 502);
  }

  return {
    id: requiredString(value.id, "user.id"),
    email: nullableString(value.email),
    displayName: nullableString(value.displayName),
    createdAt: requiredString(value.createdAt, "user.createdAt"),
    updatedAt: requiredString(value.updatedAt, "user.updatedAt"),
    lastLoginAt: nullableString(value.lastLoginAt),
  };
}

function parseSubscription(value: unknown): AccountSubscription {
  if (!isRecord(value)) {
    throw new AccountApiError("Invalid account subscription response", 502);
  }

  return {
    plan: requiredString(value.plan, "subscription.plan"),
    status: requiredString(value.status, "subscription.status"),
    accessUntil: nullableString(value.accessUntil),
  };
}

function isEntitlementValue(value: unknown): value is EntitlementValue {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

function parseEntitlements(value: unknown): EntitlementMap {
  if (!isRecord(value)) {
    throw new AccountApiError("Invalid account entitlements response", 502);
  }

  const entitlements: Record<string, EntitlementValue> = {};
  for (const [key, entitlementValue] of Object.entries(value)) {
    if (!isEntitlementValue(entitlementValue)) {
      throw new AccountApiError(`Invalid entitlement value: ${key}`, 502);
    }
    entitlements[key] = entitlementValue;
  }
  return entitlements;
}

function parseAccountAccess(value: unknown): AccountAccess {
  if (!isRecord(value)) {
    throw new AccountApiError("Invalid account response", 502);
  }

  return {
    user: parseUser(value.user),
    subscription: parseSubscription(value.subscription),
    entitlements: parseEntitlements(value.entitlements),
  };
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Keep the generic status message when the response body is not JSON.
  }
  return `Account API request failed with status ${response.status}`;
}

export async function fetchCurrentAccount(
  accessToken: string,
  signal?: AbortSignal,
): Promise<AccountAccess> {
  const response = await fetch(`${accountAuthConfig.centralApiBaseUrl}/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new AccountApiError(await responseMessage(response), response.status);
  }

  return parseAccountAccess(await response.json());
}
