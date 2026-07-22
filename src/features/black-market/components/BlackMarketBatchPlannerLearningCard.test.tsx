import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlackMarketBatchPlannerLearningCard } from "./BlackMarketBatchPlannerLearningCard";

describe("BlackMarketBatchPlannerLearningCard", () => {
  it("explains the workflow, strategies and missing coverage state", () => {
    const markup = renderToStaticMarkup(<BlackMarketBatchPlannerLearningCard />);

    expect(markup).toContain("¿Qué decisión toma este planificador?");
    expect(markup).toContain("Comprar terminado");
    expect(markup).toContain("Fabricar sin foco");
    expect(markup).toContain("Capital requerido");
    expect(markup).toContain("Sin cobertura");
    expect(markup).toContain(
      'href="/guias/planificador-batch-lista-compra-albion-online"',
    );
  });
});
