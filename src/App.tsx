import { lazy, Suspense, useState } from 'react'
import type { Item } from '@core/domain/entities/Item'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'
import { AppHeader } from './app/AppHeader'
import { AppShell } from './app/AppShell'
import { CatalogIcon } from './app/AppIcons'
import { ModuleHeader } from './app/ModuleHeader'
import type { AppModule } from './app/types'
import { EmptyDetailState } from '@features/craft-calculator/components/EmptyDetailState'
import { ItemDetailPanel } from '@features/craft-calculator/components/ItemDetailPanel'

const ItemBrowserPanel = lazy(() =>
  import('@features/item-browser/components/ItemBrowserPanel').then((module) => ({
    default: module.ItemBrowserPanel,
  })),
)
const PresetLibraryPage = lazy(() =>
  import('@features/presets/components/PresetLibraryPage').then((module) => ({
    default: module.PresetLibraryPage,
  })),
)
const RefiningComingSoonPage = lazy(() =>
  import('@features/refining-calculator/components/RefiningComingSoonPage').then(
    (module) => ({
      default: module.RefiningComingSoonPage,
    }),
  ),
)

const repository = new JsonItemRepository()

function SidebarFallback() {
  return (
    <div className="space-y-3 p-4">
      <div className="h-9 animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-24 animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-24 animate-pulse rounded-lg bg-surface-raised" />
      <p className="text-xs text-text-faint">Cargando catálogo…</p>
    </div>
  )
}

function ModuleFallback({ label }: { readonly label: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-6">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="h-5 w-48 animate-pulse rounded bg-surface-raised" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-surface-raised" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-28 animate-pulse rounded-lg bg-surface-raised" />
        </div>
        <p className="mt-4 text-xs text-text-faint">Cargando {label}…</p>
      </div>
    </div>
  )
}

function App() {
  const [activeModule, setActiveModule] = useState<AppModule>('crafting')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)

  function navigate(module: AppModule) {
    setActiveModule(module)
    setIsCatalogOpen(false)
  }

  function selectItem(item: Item) {
    setSelectedItem(item)
    setIsCatalogOpen(false)
  }

  const header = (
    <AppHeader
      activeModule={activeModule}
      itemCount={repository.getAll().length}
      onNavigate={navigate}
      onOpenCatalog={() => setIsCatalogOpen(true)}
    />
  )

  const catalog = activeModule === 'crafting' ? (
    <Suspense fallback={<SidebarFallback />}>
      <ItemBrowserPanel
        repository={repository}
        selectedId={selectedItem?.id ?? null}
        onSelect={selectItem}
      />
    </Suspense>
  ) : undefined

  return (
    <AppShell
      header={header}
      sidebar={catalog}
      sidebarLabel="Catálogo de crafteo"
      isSidebarOpen={isCatalogOpen}
      onCloseSidebar={() => setIsCatalogOpen(false)}
    >
      {activeModule === 'crafting' && (
        <>
          <ModuleHeader
            eyebrow="Módulo de crafteo"
            title="Calculadora de producción"
            description="Selecciona un objeto, configura las condiciones de producción y compara materiales, retorno, costos y rentabilidad antes de craftear."
            actions={
              <button
                type="button"
                onClick={() => setIsCatalogOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border lg:hidden"
              >
                <CatalogIcon className="h-4 w-4" />
                Explorar catálogo
              </button>
            }
          />

          {selectedItem ? (
            <ItemDetailPanel
              key={selectedItem.id}
              item={selectedItem}
              repository={repository}
            />
          ) : (
            <EmptyDetailState onBrowseCatalog={() => setIsCatalogOpen(true)} />
          )}
        </>
      )}

      {activeModule === 'refining' && (
        <>
          <ModuleHeader
            eyebrow="Módulo de refinamiento"
            title="Calculadora de refinamiento"
            description="Un espacio dedicado a convertir recursos, retornos y tarifas de estación en costos netos y decisiones de venta claras."
            badge="Próximamente"
          />
          <Suspense fallback={<ModuleFallback label="refinamiento" />}>
            <RefiningComingSoonPage onOpenCrafting={() => navigate('crafting')} />
          </Suspense>
        </>
      )}

      {activeModule === 'presets' && (
        <>
          <ModuleHeader
            eyebrow="Biblioteca local"
            title="Presets de producción"
            description="Administra configuraciones frecuentes de ciudad, especialidad, foco, bono diario y Premium guardadas en este navegador."
          />
          <Suspense fallback={<ModuleFallback label="presets" />}>
            <PresetLibraryPage onOpenCrafting={() => navigate('crafting')} />
          </Suspense>
        </>
      )}
    </AppShell>
  )
}

export default App
