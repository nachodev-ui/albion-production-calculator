import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";
import { AppHeader } from "../AppHeader";
import { AppShell } from "../AppShell";
import { MainNavigation } from "../MainNavigation";

function countOccurrences(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0;
}

describe("app accessibility", () => {
  it("renders primary navigation with current-page state and native buttons", () => {
    const markup = renderToStaticMarkup(
      <MainNavigation activeModule="crafting" onNavigate={vi.fn()} />,
    );

    expect(markup).toContain('aria-label="Navegación principal"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Crafteo");
    expect(markup).toContain("Refinamiento");
    expect(markup).toContain("Black Market");
    expect(markup).toContain("Presets");
    expect(markup).toContain("Guías");
    expect(countOccurrences(markup, /<button\b/g)).toBe(5);
    expect(countOccurrences(markup, /type="button"/g)).toBe(5);
  });

  it("labels header actions for keyboard and assistive technology users", () => {
    const markup = renderToStaticMarkup(
      <AppHeader
        activeModule="crafting"
        itemCount={1234}
        onNavigate={vi.fn()}
        onOpenCatalog={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Ir a la calculadora de crafteo"');
    expect(markup).toContain('aria-label="Abrir catálogo de objetos"');
    expect(markup).toContain("Navegación principal");
    expect(markup).toContain("ítems cargados");
  });

  it("names the mobile catalog dialog and close controls", () => {
    const markup = renderToStaticMarkup(
      <AppShell
        header={<div>Header</div>}
        sidebar={<div>Sidebar</div>}
        sidebarLabel="Catálogo de crafteo"
        isSidebarOpen
        onCloseSidebar={vi.fn()}
      >
        <main>Contenido</main>
      </AppShell>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-label="Catálogo de crafteo"');
    expect(markup).toContain('aria-label="Cerrar catálogo"');
  });

  it("keeps lazy loading states visible instead of rendering empty panels", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Cargando catálogo");
  });
});
