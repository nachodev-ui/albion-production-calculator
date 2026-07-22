import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuidesHubPage } from "./GuidesHubPage";

describe("GuidesHubPage", () => {
  it("renders the guides hierarchy with crawlable article and tool links", () => {
    const markup = renderToStaticMarkup(<GuidesHubPage />);

    expect(markup).toContain("Guías de economía de Albion Online");
    expect(markup).toContain('href="/guias/rentabilidad-crafteo-albion-online"');
    expect(markup).toContain(
      'href="/guias/retorno-materiales-rrr-albion-online"',
    );
    expect(markup).toContain('href="/guias/black-market-caerleon-rentable"');
    expect(markup).toContain(
      'href="/guias/planificador-batch-lista-compra-albion-online"',
    );
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/black-market"');
    expect(markup).toContain('aria-label="Migas de pan"');
  });
});
