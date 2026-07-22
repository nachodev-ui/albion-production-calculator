import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BatchPlannerGuidePage } from "./BatchPlannerGuidePage";

describe("BatchPlannerGuidePage", () => {
  it("teaches the complete workflow with crawlable links", () => {
    const markup = renderToStaticMarkup(<BatchPlannerGuidePage />);

    expect(markup).toContain(
      "Cómo usar el planificador batch y la lista de compra en Albion Online",
    );
    expect(markup).toContain("Capital requerido");
    expect(markup).toContain("consumo efectivo");
    expect(markup).toContain("Sin cobertura");
    expect(markup).toContain("Cómo funciona técnicamente");
    expect(markup).toContain('href="/black-market"');
    expect(markup).toContain('href="/guias"');
    expect(markup).toContain('aria-label="Migas de pan"');
  });
});
