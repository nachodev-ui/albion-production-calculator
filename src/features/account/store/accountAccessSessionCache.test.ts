import { describe, expect, it } from "vitest";
import type { AccountAccess } from "../types";
import { ENTITLEMENT_KEYS } from "../types";
import {
  ACCOUNT_ACCESS_SESSION_CACHE_MAX_AGE_MS,
  deserializeAccountAccessSession,
  serializeAccountAccessSession,
} from "./accountAccessSessionCache";

const SUBJECT = "auth0|admin-user";
const SYNCED_AT = "2026-07-16T05:00:00.000Z";
const ACCESS: AccountAccess = {
  user: {
    id: "user-1",
    email: "admin@example.com",
    displayName: "Admin",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-16T05:00:00.000Z",
    lastLoginAt: "2026-07-16T05:00:00.000Z",
  },
  subscription: {
    plan: "pro",
    status: "active",
    accessUntil: null,
  },
  entitlements: {
    [ENTITLEMENT_KEYS.optimizerLiquidity]: true,
    [ENTITLEMENT_KEYS.blackMarketAnalytics]: true,
  },
};

const SYNCED_AT_MS = Date.parse(SYNCED_AT);

describe("accountAccessSessionCache", () => {
  it("restores fresh verified access only for the same Auth0 subject", () => {
    const raw = serializeAccountAccessSession(SUBJECT, ACCESS, SYNCED_AT);

    expect(
      deserializeAccountAccessSession(raw, SUBJECT, SYNCED_AT_MS + 5_000),
    ).toEqual({ access: ACCESS, syncedAt: SYNCED_AT });
    expect(
      deserializeAccountAccessSession(
        raw,
        "auth0|another-user",
        SYNCED_AT_MS + 5_000,
      ),
    ).toBeNull();
  });

  it("rejects expired access instead of retaining it indefinitely", () => {
    const raw = serializeAccountAccessSession(SUBJECT, ACCESS, SYNCED_AT);

    expect(
      deserializeAccountAccessSession(
        raw,
        SUBJECT,
        SYNCED_AT_MS + ACCOUNT_ACCESS_SESSION_CACHE_MAX_AGE_MS + 1,
      ),
    ).toBeNull();
  });

  it("rejects corrupt or structurally invalid cache entries", () => {
    expect(deserializeAccountAccessSession("not-json", SUBJECT)).toBeNull();
    expect(
      deserializeAccountAccessSession(
        JSON.stringify({
          version: 1,
          subject: SUBJECT,
          syncedAt: SYNCED_AT,
          access: { subscription: { plan: "pro" } },
        }),
        SUBJECT,
        SYNCED_AT_MS,
      ),
    ).toBeNull();
  });
});
