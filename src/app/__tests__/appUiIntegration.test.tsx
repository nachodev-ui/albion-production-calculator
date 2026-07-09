import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AppHeader } from '../AppHeader'
import { AppShell } from '../AppShell'
import { MainNavigation } from '../MainNavigation'

function countOccurrences(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0
}

describe('app UI integration', () => {
  it('starts in the crafting module with catalog and dataset lazy states visible', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('Módulo de crafteo')
    expect(markup).toContain('Calculadora de producción')
    expect(markup).toContain('Explorar catálogo')
    expect(markup).toContain('Cargando catálogo')
    expect(markup).toContain('Contenido principal')
  })

  it('renders module navigation states for crafting, refining and presets', () => {
    const craftingMarkup = renderToStaticMarkup(
      <MainNavigation activeModule="crafting" onNavigate={vi.fn()} />,
    )
    const refiningMarkup = renderToStaticMarkup(
      <MainNavigation activeModule="refining" onNavigate={vi.fn()} />,
    )
    const presetsMarkup = renderToStaticMarkup(
      <MainNavigation activeModule="presets" onNavigate={vi.fn()} />,
    )

    expect(countOccurrences(craftingMarkup, /aria-current="page"/g)).toBe(1)
    expect(countOccurrences(refiningMarkup, /aria-current="page"/g)).toBe(1)
    expect(countOccurrences(presetsMarkup, /aria-current="page"/g)).toBe(1)
    expect(craftingMarkup).toContain('Crafteo')
    expect(refiningMarkup).toContain('Refinamiento')
    expect(presetsMarkup).toContain('Presets')
  })

  it('exposes catalog open action only for crafting header', () => {
    const craftingHeader = renderToStaticMarkup(
      <AppHeader
        activeModule="crafting"
        itemCount={0}
        onNavigate={vi.fn()}
        onOpenCatalog={vi.fn()}
      />,
    )
    const presetsHeader = renderToStaticMarkup(
      <AppHeader
        activeModule="presets"
        itemCount={0}
        onNavigate={vi.fn()}
        onOpenCatalog={vi.fn()}
      />,
    )

    expect(craftingHeader).toContain('Abrir catálogo de objetos')
    expect(presetsHeader).not.toContain('Abrir catálogo de objetos')
  })

  it('keeps mobile catalog drawer mounted as a labelled dialog when opened', () => {
    const markup = renderToStaticMarkup(
      <AppShell
        header={<div>Header</div>}
        sidebar={<div>Cargando catálogo…</div>}
        sidebarLabel="Catálogo de crafteo"
        isSidebarOpen
        onCloseSidebar={vi.fn()}
      >
        <div>Vista de módulo</div>
      </AppShell>,
    )

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-label="Catálogo de crafteo"')
    expect(markup).toContain('Cargando catálogo')
    expect(markup).toContain('Vista de módulo')
    expect(countOccurrences(markup, /aria-label="Cerrar catálogo"/g)).toBe(2)
  })
})
