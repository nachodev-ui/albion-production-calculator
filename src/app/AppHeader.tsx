import type { AppModule } from './types'
import { AnvilIcon, CatalogIcon } from './AppIcons'
import { MainNavigation } from './MainNavigation'

interface AppHeaderProps {
  readonly activeModule: AppModule
  readonly itemCount: number
  readonly onNavigate: (module: AppModule) => void
  readonly onOpenCatalog: () => void
}

export function AppHeader({
  activeModule,
  itemCount,
  onNavigate,
  onOpenCatalog,
}: AppHeaderProps) {
  return (
    <header className="relative z-50 shrink-0 border-b border-border bg-surface/92 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/78">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-border to-transparent" />

      <div className="mx-auto flex min-h-[76px] w-full items-center gap-4 px-4 py-3 sm:px-5 lg:gap-6 lg:px-6">
        <button
          type="button"
          onClick={() => onNavigate('crafting')}
          className="group flex min-w-0 shrink-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          aria-label="Ir a la calculadora de crafteo"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-accent-border bg-gradient-to-br from-accent-muted to-surface-raised text-accent shadow-[0_10px_35px_rgba(0,0,0,0.24)] transition-transform group-hover:-translate-y-0.5">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_45%)]" />
            <AnvilIcon className="relative h-6 w-6" />
          </span>

          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate font-display text-base tracking-tight text-text lg:text-lg">
              Albion Production Calculator
            </span>
            <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-text-faint lg:text-[10px]">
              Costos, retorno y rentabilidad
            </span>
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <MainNavigation
            activeModule={activeModule}
            onNavigate={onNavigate}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {activeModule === 'crafting' && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-raised text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border lg:hidden"
              aria-label="Abrir catálogo de objetos"
            >
              <CatalogIcon className="h-5 w-5" />
            </button>
          )}

          <div className="hidden items-center gap-2 rounded-xl border border-border bg-bg/45 px-3 py-2 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-[11px] tabular text-text">
                {new Intl.NumberFormat('es-CL').format(itemCount)}
              </span>
              <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                ítems cargados
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
