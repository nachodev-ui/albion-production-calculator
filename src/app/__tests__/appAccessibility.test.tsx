import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AppHeader } from '../AppHeader'
import { AppShell } from '../AppShell'
import { MainNavigation } from '../MainNavigation'

function countOccurrences(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0
}

describe('app accessibility', () => {
  it('renders primary navigation with current-page state and native buttons', () => {
    const markup = renderToStaticMarkup(
      <MainNavigation activeModule="crafting" onNavigate={vi.fn()} />,
    )

    expect(markup).toContain('aria-label="Navegación principal"')
    expect(markup).toContain('aria-current="page"')
    expect(markup).toContain('Crafteo')
    expect(markup).toContain('Refinamiento')
    expect(markup).toContain('Presets')
    expect(countOccurrences(markup, /<button\b/g)).toBe(3)
    expect(countOccurrences(markup, /type="button"/g)).toBe(3)
  })

  it('labels header actions for keyboard and assistive technology users', () => {
    const markup = renderToStaticMarkup(
      <AppHeader
        activeModule="crafting"
        itemCount={1234}
        onNavigate={vi.fn()}
        onOpenCatalog={vi.fn()}
      />,
    )

    expect(markup).toContain('aria-label="Ir a la calculadora de crafteo"')
    expect(markup).toContain('aria-label="Abrir catálogo de objetos"')
    expect(markup).toContain('Navegación principal')
    expect(markup).toContain('ítems cargados')
  })

  it('names the mobile catalog dialog and close controls', () => {
    const markup = renderToStaticMarkup(
      <AppShell
        header={<div>Header</div>}
        sidebar={<nav aria-label="Catálogo de prueba">Contenido</nav>}
        sidebarLabel="Catálogo de crafteo"
        isSidebarOpen
        onCloseSidebar={vi.fn()}
      >
        <p>Contenido principal</p>
      </AppShell>,
    )

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('aria-label="Catálogo de crafteo"')
    expect(markup).toContain('aria-label="Cerrar catálogo"')
    expect(markup).toContain('aria-label="Contenido principal"')
    expect(countOccurrences(markup, /aria-label="Cerrar catálogo"/g)).toBe(2)
  })

  it('keeps lazy loading states visible instead of rendering empty panels', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('Cargando catálogo')
    expect(markup).toContain('Explorar catálogo')
    expect(markup).toContain('Contenido principal')
    expect(markup).toContain('Módulo de crafteo')
  })
})
