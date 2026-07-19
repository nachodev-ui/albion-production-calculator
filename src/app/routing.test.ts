import { describe, expect, it } from "vitest";
import { routeFromPathname } from "./routing";

describe("routeFromPathname", () => {
  it.each([
    ["/", "crafting"],
    ["/crafting", "crafting"],
    ["/refining", "refining"],
    ["/black-market", "black-market"],
    ["/black-market/", "black-market"],
    ["/presets", "presets"],
    ["/plans", "plans"],
    ["/account", "account"],
    ["/account/", "account"],
    ["/profile", "profile"],
    ["/profile/", "profile"],
    ["/admin", "admin"],
    ["/admin/", "admin"],
    [
      "/guias/rentabilidad-crafteo-albion-online",
      "guide-crafting-profit",
    ],
    [
      "/guias/retorno-materiales-rrr-albion-online",
      "guide-resource-return-rate",
    ],
    [
      "/guias/black-market-caerleon-rentable",
      "guide-black-market-profit",
    ],
    [
      "/guias/black-market-caerleon-rentable/",
      "guide-black-market-profit",
    ],
  ] as const)("maps %s to %s", (pathname, expected) => {
    expect(routeFromPathname(pathname)).toBe(expected);
  });

  it("falls back to crafting for unknown paths", () => {
    expect(routeFromPathname("/unknown")).toBe("crafting");
  });
});
