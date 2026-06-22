import type { ReactNode } from 'react'
import { CloseIcon } from './AppIcons'

interface AppShellProps {
  readonly header: ReactNode
  readonly sidebar?: ReactNode
  readonly sidebarLabel?: string
  readonly isSidebarOpen: boolean
  readonly onCloseSidebar: () => void
  readonly children: ReactNode
}

export function AppShell({
  header,
  sidebar,
  sidebarLabel = 'Catálogo',
  isSidebarOpen,
  onCloseSidebar,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-bg text-text">
      {header}

      <div className="relative flex min-h-0 flex-1">
        {sidebar && (
          <aside className="hidden w-[420px] shrink-0 border-r border-border bg-surface lg:block">
            {sidebar}
          </aside>
        )}

        {sidebar && isSidebarOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <button
              type="button"
              aria-label="Cerrar catálogo"
              onClick={onCloseSidebar}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label={sidebarLabel}
              className="absolute inset-y-0 left-0 flex w-[min(92vw,430px)] flex-col border-r border-border bg-surface shadow-2xl"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
                <div>
                  <p className="text-sm font-semibold text-text">{sidebarLabel}</p>
                  <p className="text-[11px] text-text-faint">
                    Selecciona una categoría, rama y tier
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onCloseSidebar}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                  aria-label="Cerrar catálogo"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1">{sidebar}</div>
            </aside>
          </div>
        )}

        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full bg-accent/[0.035] blur-3xl" />
            <div className="absolute -bottom-48 left-1/4 h-[34rem] w-[34rem] rounded-full bg-positive/[0.025] blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
          </div>

          <div className="relative min-h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
