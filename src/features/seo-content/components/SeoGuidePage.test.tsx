import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SeoGuideRoute } from "@app/types";
import { SeoGuidePage } from "./SeoGuidePage";

const cases: readonly [SeoGuideRoute, string, string][] = [
  [
    "guide-crafting-profit",
    "rentabilidad-crafteo",
    "Resumen ilustrativo de rentabilidad de crafteo",
  ],
  [
    "guide-resource-return-rate",
    "retorno-materiales-rrr",
    "Ejemplo de materiales requeridos, devueltos y consumidos",
  ],
  [
    "guide-black-market-profit",
    "black-market-caerleon",
    "Comparación ilustrativa entre comprar y transportar",
  ],
];

describe("SeoGuidePage images", () => {
  it.each(cases)("renders responsive real imagery for %s", (route, slug, alt) => {
    const markup = renderToStaticMarkup(<SeoGuidePage route={route} />);

    expect(markup).toContain(`/images/guides/${slug}-1x1.png`);
    expect(markup).toContain(`/images/guides/${slug}-4x3.png`);
    expect(markup).toContain(`/images/guides/${slug}-16x9.png`);
    expect(markup).toContain(alt);
    expect(markup).toContain('fetchPriority="high"');
  });
});
