import { lazy, Suspense, useEffect, useState } from "react";
import type { Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import { AppHeader } from "./app/AppHeader";
import { AppShell } from "./app/AppShell";
import { CatalogIcon } from "./app/AppIcons";
import { ModuleHeader } from "./app/ModuleHeader";
import { useAppRoute } from "./app/routing";
import type { AppModule, AppRoute } from "./app/types";
import { EmptyDetailState } from "@features/craft-calculator/components/EmptyDetailState";
import { ItemDetailPanel } from "@features/craft-calculator/components/ItemDetailPanel";

const ItemBrowserPanel = lazy(() =>
  import("@features/item-browser/components/ItemBrowserPanel").then(
    (module) => ({ default: module.ItemBrowserPanel }),
  ),
);
const PresetLibraryPage = lazy(() =>
  import("@features/presets/components/PresetLibraryPage").then((module) => ({
    default: module.PresetLibraryPage,
  })),
);
const RefiningComingSoonPage = lazy(() =>
  import("@features/refining-calculator/components/RefiningComingSoonPage").then(
    (module) => ({ default: module.RefiningComingSoonPage }),
  ),
);
const PlansPage = lazy(() =>
  import("@features/account/components/PlansPage").then((module) => ({
    default: module.PlansPage,
  })),
);
const AccountPage = lazy(() =>
  import("@features/account/components/AccountPage").then((module) => ({
    default: module.AccountPage,
  })),
);
const PlayerProfilePage = lazy(() =>
  import("@features/player-profile/components/PlayerProfilePage").then((module) => ({
    default: module.PlayerProfilePage,
  })),
);
const AdminPage = lazy(() =>
  import("@features/admin/components/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);

async function loadItemRepository(): Promise<ItemRepository> {
  const { JsonItemRepository } =
    await import("@data/repositories/JsonItemRepository");
  return new JsonItemRepository();
}

function SidebarFallback() {
  return (
    <div className="space-y-3 p-4">
      <div className="h-9 animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-24 animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-24 animate-pulse rounded-lg bg-surface-raised" />
      <p className="text-xs text-text-faint">Cargando catálogo…</p>
    </div>
  );
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
  );
}

function App() {
  const { route, navigate } = useAppRoute();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [repository, setRepository] = useState<ItemRepository | null>(null);
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    void loadItemRepository()
      .then((nextRepository) => {
        if (isActive) setRepository(nextRepository);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setRepositoryError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el catálogo de ítems.",
        );
      });
    return () => {
      isActive = false;
    };
  }, []);

  function navigateTo(nextRoute: AppRoute) {
    navigate(nextRoute);
    setIsCatalogOpen(false);
  }
  function navigateModule(module: AppModule) {
    navigateTo(module);
  }
  function selectItem(item: Item) {
    setSelectedItem(item);
    setIsCatalogOpen(false);
  }

  const header = (
    <AppHeader
      activeRoute={route}
      itemCount={repository?.getAll().length ?? 0}
      onNavigate={navigateTo}
      onOpenCatalog={() => setIsCatalogOpen(true)}
    />
  );
  const catalog =
    route === "crafting" ? (
      repository ? (
        <Suspense fallback={<SidebarFallback />}>
          <ItemBrowserPanel
            repository={repository}
            selectedId={selectedItem?.id ?? null}
            onSelect={selectItem}
          />
        </Suspense>
      ) : (
        <SidebarFallback />
      )
    ) : undefined;

  return (
    <AppShell
      header={header}
      sidebar={catalog}
      sidebarLabel="Catálogo de crafteo"
      isSidebarOpen={isCatalogOpen}
      onCloseSidebar={() => setIsCatalogOpen(false)}
    >
      {route === "crafting" && (
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
          {repositoryError ? (
            <div className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-6">
              <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
                {repositoryError}
              </p>
            </div>
          ) : selectedItem && repository ? (
            <ItemDetailPanel
              key={selectedItem.id}
              item={selectedItem}
              repository={repository}
            />
          ) : selectedItem ? (
            <div className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-6">
              <ModuleFallback label="calculadora de producción" />
            </div>
          ) : (
            <EmptyDetailState onBrowseCatalog={() => setIsCatalogOpen(true)} />
          )}
        </>
      )}
      {route === "refining" && (
        <>
          <ModuleHeader
            eyebrow="Módulo de refinamiento"
            title="Calculadora de refinamiento"
            description="Un espacio dedicado a convertir recursos, retornos y tarifas de estación en costos netos y decisiones de venta claras."
            badge="Próximamente"
          />
          <Suspense fallback={<ModuleFallback label="refinamiento" />}>
            <RefiningComingSoonPage
              onOpenCrafting={() => navigateModule("crafting")}
            />
          </Suspense>
        </>
      )}
      {route === "presets" && (
        <>
          <ModuleHeader
            eyebrow="Biblioteca local"
            title="Presets de producción"
            description="Administra configuraciones frecuentes de ciudad, especialidad, foco, bono diario y Premium guardadas en este navegador."
          />
          <Suspense fallback={<ModuleFallback label="presets" />}>
            <PresetLibraryPage
              onOpenCrafting={() => navigateModule("crafting")}
            />
          </Suspense>
        </>
      )}
      {route === "plans" && (
        <>
          <ModuleHeader
            eyebrow="Planes de acceso"
            title="Free y Pro"
            description="Compara límites y herramientas disponibles. El acceso efectivo siempre lo resuelve la API central mediante entitlements."
          />
          <Suspense fallback={<ModuleFallback label="planes" />}>
            <PlansPage onNavigate={navigateTo} />
          </Suspense>
        </>
      )}
      {route === "account" && (
        <>
          <ModuleHeader
            eyebrow="Cuenta"
            title="Perfil y permisos"
            description="Consulta tu identidad autenticada, plan efectivo y capacidades habilitadas por la API central."
          />
          <Suspense fallback={<ModuleFallback label="cuenta" />}>
            <AccountPage onNavigate={navigateTo} />
          </Suspense>
        </>
      )}
      {route === "profile" && (
        <>
          <ModuleHeader
            eyebrow="Mi perfil"
            title="Estadísticas de Albion"
            description="Vincula un personaje público, consulta tu resumen PvP y revisa la actividad reciente."
          />
          <Suspense fallback={<ModuleFallback label="perfil de Albion" />}>
            <PlayerProfilePage onNavigate={navigateTo} />
          </Suspense>
        </>
      )}
      {route === "admin" && (
        <>
          <ModuleHeader
            eyebrow="Administración segura"
            title="Usuarios y acceso Pro"
            description="Gestiona grants manuales, revisa suscripciones y consulta la auditoría. Cada operación se autoriza en la API central."
          />
          <Suspense fallback={<ModuleFallback label="administración" />}>
            <AdminPage onNavigate={navigateTo} />
          </Suspense>
        </>
      )}
    </AppShell>
  );
}

export default App;
