import { describe, expect, it } from "vitest";
import {
  BLACK_MARKET_SERVER_OPTIONS,
  blackMarketScannerCategoryName,
} from "./blackMarketScannerConfig";

describe("blackMarketScannerConfig", () => {
  it("uses the current public server names without changing API values", () => {
    expect(BLACK_MARKET_SERVER_OPTIONS).toEqual([
      { value: "west", label: "Americas" },
      { value: "east", label: "Asia" },
      { value: "europe", label: "Europe" },
    ]);
  });

  it("translates opportunity categories for the interface", () => {
    expect(blackMarketScannerCategoryName("weapon")).toBe("Armas");
    expect(blackMarketScannerCategoryName("offhand")).toBe(
      "Mano secundaria",
    );
  });
});
