/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Black Market opportunity results layout", () => {
  it("loads the dedicated results stylesheet", () => {
    const index = readProjectFile("index.html");

    expect(index).toContain('/black-market-results-table.css');
  });

  it("uses responsive horizontal cards instead of an oversized table", () => {
    const component = readProjectFile(
      "src/features/black-market/components/BlackMarketOpportunityResults.tsx",
    );

    expect(component).toContain("function OpportunityCard");
    expect(component).toContain("black-market-results-scroll");
    expect(component).toContain("xl:grid-cols-[minmax(15rem,1.35fr)");
    expect(component).toContain("Beneficio neto");
    expect(component).toContain("ROI neto");
    expect(component).toContain("Riesgo y acción");
    expect(component).not.toContain("<table");
    expect(component).not.toContain("min-w-[92rem]");
  });

  it("keeps secondary evidence visually separate from the main result", () => {
    const component = readProjectFile(
      "src/features/black-market/components/BlackMarketOpportunityResults.tsx",
    );

    expect(component).toContain("secondaryFacts");
    expect(component).toContain("Compra de objeto terminado");
    expect(component).toContain("Pérdida esperada");
    expect(component).toContain("BlackMarketDataConfidenceBadge");
  });

  it("keeps long result lists inside a bounded vertical scroll area", () => {
    const css = readProjectFile("public/black-market-results-table.css");

    expect(css).toContain(".black-market-results-scroll");
    expect(css).toContain("max-height: min(72vh, 56rem)");
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain("scrollbar-gutter: stable");
    expect(css).not.toContain("table.min-w");
  });
});
