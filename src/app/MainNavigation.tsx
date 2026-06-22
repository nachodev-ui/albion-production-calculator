import type { AppModule } from './types'
import { HammerIcon, PresetIcon, RefiningIcon } from './AppIcons'

interface MainNavigationProps {
  readonly activeModule: AppModule
  readonly onNavigate: (module: AppModule) => void
}

const NAV_ITEMS = [
  {
    id: 'crafting' as const,
    label: 'Crafteo',
    description: 'Costos y rentabilidad',
    icon: HammerIcon,
  },
  {
    id: 'refining' as const,
    label: 'Refinamiento',
    description: 'Próximamente',
    icon: RefiningIcon,
    badge: 'Próximamente',
  },
  {
    id: 'presets' as const,
    label: 'Presets',
    description: 'Configuraciones guardadas',
    icon: PresetIcon,
  },
] as const

export function MainNavigation({
  activeModule,
  onNavigate,
}: MainNavigationProps) {
  return (
    <nav aria-label="Navegación principal" className="min-w-0">
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-bg/45 p-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeModule === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border sm:px-4 ${
                isActive
                  ? 'bg-surface-raised text-text shadow-sm'
                  : 'text-text-muted hover:bg-surface/70 hover:text-text'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-accent' : 'text-text-faint group-hover:text-text-muted'
                }`}
              />

              <span className="flex min-w-0 flex-col leading-tight">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {item.label}
                  {'badge' in item && item.badge && (
                    <span className="hidden rounded-full border border-accent-border bg-accent-muted px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-accent xl:inline-flex">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="hidden text-[10px] text-text-faint xl:block">
                  {item.description}
                </span>
              </span>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-accent shadow-[0_0_10px_rgba(201,162,39,0.45)]"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
