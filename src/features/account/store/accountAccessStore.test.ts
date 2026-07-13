import { describe, expect, it } from "vitest";
import {
  currentPlan,
  entitlementIsEnabled,
  entitlementNumber,
  getEffectiveEntitlements,
} from "./accountAccessStore";
import { ENTITLEMENT_KEYS } from "../types";
import type { AccountAccess } from "../types";

const PRO_ACCESS: AccountAccess = {
  user: {
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    createdAt: "2026-07-13T00:00:00Z",
    updatedAt: "2026-07-13T00:00:00Z",
    lastLoginAt: "2026-07-13T00:00:00Z",
  },
  subscription: {
    plan: "pro",
    status: "active",
    accessUntil: null,
  },
  entitlements: {
    [ENTITLEMENT_KEYS.historyMaxDays]: 28,
    [ENTITLEMENT_KEYS.optimizerLiquidity]: true,
  },
};

describe("account access entitlements", () => {
  it("uses the Free entitlement baseline for anonymous users", () => {
    expect(entitlementNumber(null, ENTITLEMENT_KEYS.historyMaxDays)).toBe(7);
    expect(
      entitlementIsEnabled(null, ENTITLEMENT_KEYS.optimizerLiquidity),
    ).toBe(false);
    expect(currentPlan(null)).toBe("free");
  });

  it("overrides the Free baseline with effective API entitlements", () => {
    const entitlements = getEffectiveEntitlements(PRO_ACCESS);

    expect(entitlements[ENTITLEMENT_KEYS.historyMaxDays]).toBe(28);
    expect(
      entitlementIsEnabled(PRO_ACCESS, ENTITLEMENT_KEYS.optimizerLiquidity),
    ).toBe(true);
    expect(currentPlan(PRO_ACCESS)).toBe("pro");
  });

  it("preserves unspecified Free limits when the API response is partial", () => {
    expect(
      entitlementNumber(PRO_ACCESS, ENTITLEMENT_KEYS.savedConfigurationsMax),
    ).toBe(3);
  });
});
