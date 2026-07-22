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
    ["/guias", "guides"],
    ["/guias/", "guides"],
    ["/estado-datos", "guides"],
    ["/estado-datos/", "guides"],
    [
      "/guias/planificador-batch-lista-compra-albion-online",
      "guides",
    ],
    [
      "/guias/planificador-batch-lista-compra-albion-online/",
      "guides",
    ],
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

  it("keeps public auxiliary pages inside the guides shell", () => {
    expect(routeFromPathname("/estado-datos")).toBe("guides");
    expect(
      routeFromPathname(
        "/guias/planificador-batch-lista-compra-albion-online",
      ),
    ).toBe("guides");
  });

  it("falls back to crafting for unknown paths", () => {
    expect(routeFromPathname("/unknown")).toBe("crafting");
  });
});
