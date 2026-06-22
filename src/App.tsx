import { useState } from 'react'
import type { Item } from '@core/domain/entities/Item'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'
import { AppHeader } from './app/AppHeader'
import { AppShell } from './app/AppShell'
import { CatalogIcon } from './app/AppIcons'
import { ModuleHeader } from './app/ModuleHeader'
import type { AppModule } from './app/types'
import { EmptyDetailState } from '@features/craft-calculator/components/EmptyDetailState'
import { ItemDetailPanel } from '@features/craft-calculator/components/ItemDetailPanel'
import { ItemBrowserPanel } from '@features/item-browser/components/ItemBrowserPanel'
import { PresetLibraryPage } from '@features/presets/components/PresetLibraryPage'
import { RefiningComingSoonPage } from '@features/refining-calculator/components/RefiningComingSoonPage'

const repository = new JsonItemRepository()

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
    <ItemBrowserPanel
      repository={repository}
      selectedId={selectedItem?.id ?? null}
      onSelect={selectItem}
    />
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
          <RefiningComingSoonPage onOpenCrafting={() => navigate('crafting')} />
        </>
      )}

      {activeModule === 'presets' && (
        <>
          <ModuleHeader
            eyebrow="Biblioteca local"
            title="Presets de producción"
            description="Administra configuraciones frecuentes de ciudad, especialidad, foco, bono diario y Premium guardadas en este navegador."
          />
          <PresetLibraryPage onOpenCrafting={() => navigate('crafting')} />
        </>
      )}
    </AppShell>
  )
}

export default App
