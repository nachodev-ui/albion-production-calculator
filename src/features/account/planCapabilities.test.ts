import { describe, expect, it } from "vitest";
import {
  PRO_PLAN_CAPABILITIES,
  isComingSoonEntitlement,
} from "./planCapabilities";
import { ENTITLEMENT_KEYS } from "./types";

describe("plan capability availability", () => {
  it("marks only market alerts as coming soon", () => {
    const upcoming = PRO_PLAN_CAPABILITIES.filter(
      (capability) => capability.availability === "coming-soon",
    );

    expect(upcoming.map((capability) => capability.id)).toEqual([
      "market-alerts",
    ]);
    expect(isComingSoonEntitlement(ENTITLEMENT_KEYS.marketAlertsMax)).toBe(
      true,
    );
  });

  it("keeps implemented Pro capabilities labelled as available", () => {
    const availabilityById = Object.fromEntries(
      PRO_PLAN_CAPABILITIES.map((capability) => [
        capability.id,
        capability.availability,
      ]),
    );

    expect(availabilityById).toMatchObject({
      "black-market-analytics": "available",
      "liquidity-optimizer": "available",
      "cloud-presets-100": "available",
      "csv-export": "available",
      "batch-planner": "available",
      "market-alerts": "coming-soon",
    });
  });

  it("documents every advertised capability", () => {
    for (const capability of PRO_PLAN_CAPABILITIES) {
      expect(capability.label.trim().length).toBeGreaterThan(0);
      expect(capability.description.trim().length).toBeGreaterThan(0);
    }
  });
});
