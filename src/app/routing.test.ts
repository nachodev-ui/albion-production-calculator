import { describe, expect, it } from "vitest";
import { routeFromPathname } from "./routing";

describe("routeFromPathname", () => {
  it.each([
    ["/", "crafting"],
    ["/crafting", "crafting"],
    ["/refining", "refining"],
    ["/presets", "presets"],
    ["/plans", "plans"],
    ["/account", "account"],
    ["/account/", "account"],
    ["/admin", "admin"],
    ["/admin/", "admin"],
  ] as const)("maps %s to %s", (pathname, expected) => {
    expect(routeFromPathname(pathname)).toBe(expected);
  });

  it("falls back to crafting for unknown paths", () => {
    expect(routeFromPathname("/unknown")).toBe("crafting");
  });
});
