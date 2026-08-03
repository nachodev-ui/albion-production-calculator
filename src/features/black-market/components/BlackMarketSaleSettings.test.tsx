import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BLACK_MARKET_SCANNER_FILTERS } from "../storage/blackMarketScannerStorage";
import { BlackMarketSaleSettings } from "./BlackMarketSaleSettings";

describe("BlackMarketSaleSettings", () => {
  it("makes both sale modes and Premium fees explicit", () => {
    const markup = renderToStaticMarkup(
      <BlackMarketSaleSettings
        filters={DEFAULT_BLACK_MARKET_SCANNER_FILTERS}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain("Venta directa");
    expect(markup).toContain("Orden de venta");
    expect(markup).toContain("Premium");
    expect(markup).toContain("Sin Premium");
    expect(markup).toContain("Impuesto de venta");
    expect(markup).toContain("Setup fee");
    expect(markup).toContain("Resultado neto");
    expect(markup).toContain('disabled=""');
  });

  it("enables setup fee when sell-order mode is selected", () => {
    const markup = renderToStaticMarkup(
      <BlackMarketSaleSettings
        filters={{
          ...DEFAULT_BLACK_MARKET_SCANNER_FILTERS,
          saleMode: "sell-order",
        }}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain('disabled=""');
    expect(markup).toContain("Orden de venta</button>");
  });
});
