import { beforeEach, describe, expect, it } from "vitest";
import {
  accountAccessIsUnresolved,
  accountAccessRequestIsActive,
  currentPlan,
  entitlementIsEnabled,
  entitlementNumber,
  getEffectiveEntitlements,
  useAccountAccessStore,
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

beforeEach(() => {
  useAccountAccessStore.getState().clear();
});

describe("account access entitlements", () => {
  it("uses the Free entitlement baseline for confirmed anonymous users", () => {
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

describe("account access hydration state", () => {
  it("marks a first synchronization as unresolved instead of confirmed Free", () => {
    useAccountAccessStore.getState().beginLoading();
    const state = useAccountAccessStore.getState();

    expect(state.status).toBe("loading");
    expect(accountAccessRequestIsActive(state.status)).toBe(true);
    expect(accountAccessIsUnresolved(state.status, state.access)).toBe(true);
  });

  it("preserves verified Pro access while refreshing", () => {
    useAccountAccessStore.getState().setAccess(PRO_ACCESS);
    useAccountAccessStore.getState().beginLoading();
    const state = useAccountAccessStore.getState();

    expect(state.status).toBe("refreshing");
    expect(state.access).toEqual(PRO_ACCESS);
    expect(currentPlan(state.access)).toBe("pro");
    expect(accountAccessIsUnresolved(state.status, state.access)).toBe(false);
  });

  it("keeps the last verified access when a refresh fails", () => {
    useAccountAccessStore.getState().restoreAccess(
      PRO_ACCESS,
      "2026-07-16T05:00:00.000Z",
    );
    useAccountAccessStore.getState().beginLoading();
    useAccountAccessStore.getState().setError("temporary failure");
    const state = useAccountAccessStore.getState();

    expect(state.status).toBe("error");
    expect(state.access).toEqual(PRO_ACCESS);
    expect(state.lastSyncedAt).toBe("2026-07-16T05:00:00.000Z");
    expect(currentPlan(state.access)).toBe("pro");
  });
});
