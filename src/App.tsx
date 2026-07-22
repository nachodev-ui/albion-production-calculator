import { lazy, Suspense, useEffect, useState } from "react";
import type { BaseItemId, Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import { AppHeader } from "./app/AppHeader";
import { AppShell } from "./app/AppShell";
import { CatalogIcon } from "./app/AppIcons";
import { ModuleHeader } from "./app/ModuleHeader";
import { useAppRoute } from "./app/routing";
import { RouteSeo } from "./app/seo/RouteSeo";
import { isSeoGuideRoute } from "./app/types";
import type { AppModule, AppRoute } from "./app/types";
import {
  EmptyDetailState,
  type GuidedCraftingExample,
} from "@features/craft-calculator/components/EmptyDetailState";
import { ItemDetailPanel } from "@features/craft-calculator/components/ItemDetailPanel";
import { useCraftTreeStore } from "@features/craft-calculator/store/craftTreeStore";
import {
  loadCraftWorkspace,
  updateCraftWorkspace,
} from "@features/craft-calculator/store/craftWorkspaceStorage";
import {
  loadBlackMarketWorkspace,
  saveBlackMarketWorkspace,
} from "@features/black-market/storage/blackMarketWorkspaceStorage";
import {
  recordRecentItem,
  recordRecentSearch,
  type RecentCatalogSearch,
} from "@features/onboarding/storage/guidedStartStorage";
import type { ItemBrowserSearchRequest } from "@features/item-browser/components/ItemBrowserPanel";

const ItemBrowserPanel = lazy(() =>
  import("@features/item-browser/components/ItemBrowserPanel").then(
    (module) => ({ default: module.ItemBrowserPanel }),
  ),
);
const BlackMarketOpportunityScannerPage = lazy(() =>
  import("@features/black-market/components/BlackMarketOpportunityScannerPage").then(
    (module) => ({
      default: module.BlackMarketOpportunityScannerPage,
    }),
  ),
);
const BlackMarketPage = lazy(() =>
  import("@features/black-market/components/BlackMarketPage").then((module) => ({
    default: module.BlackMarketPage,
  })),
);
const PresetLibraryPage = lazy(() =>
  import("@features/presets/components/PresetLibraryPage").then((module) => ({
    default: module.PresetLibraryPage,
  })),
);
const RefiningCalculatorPage = lazy(() =>
  import("@features/refining-calculator/components/RefiningCalculatorPage").then(
    (module) => ({ default: module.RefiningCalculatorPage }),
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
  import("@features/player-profile/components/PlayerProfilePage").then(
    (module) => ({
      default: module.PlayerProfilePage,
    }),
  ),
);
const AdminPage = lazy(() =>
  import("@features/admin/components/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);
const GuidesHubPage = lazy(() =>
  import("@features/seo-content/components/GuidesHubPage").then((module) => ({
    default: module.GuidesHubPage,
  })),
);
const SeoGuidePage = lazy(() =>
  import("@features/seo-content/components/SeoGuidePage").then((module) => ({
    default: module.SeoGuidePage,
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

function RepositoryError({ message }: { readonly message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-6">
      <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
        {message}
      </p>
    </div>
  );
}

type BlackMarketView = "scanner" | "single";

function App() {
  const { route, navigate } = useAppRoute();
  const [selectedItemId, setSelectedItemId] = useState<BaseItemId | null>(null);
  const [lastCalculationItemId, setLastCalculationItemId] =
    useState<BaseItemId | null>(() => loadCraftWorkspace().selectedItemId);
  const [repository, setRepository] = useState<ItemRepository | null>(null);
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogSearchRequest, setCatalogSearchRequest] =
    useState<ItemBrowserSearchRequest | null>(null);
  const [blackMarketView, setBlackMarketView] =
    useState<BlackMarketView>("scanner");
  const selectedItem =
    repository && selectedItemId ? repository.getById(selectedItemId) : null;
  const lastCalculationItem =
    repository && lastCalculationItemId
      ? repository.getById(lastCalculationItemId)
      : null;

  useEffect(() => {
    let isActive = true;
    void loadItemRepository()
      .then((nextRepository) => {
        if (!isActive) return;

        setRepository(nextRepository);
        setSelectedItemId((currentItemId) => {
          if (!currentItemId || nextRepository.getById(currentItemId)) {
            return currentItemId;
          }
          return null;
        });
        setLastCalculationItemId((currentItemId) => {
          if (!currentItemId || nextRepository.getById(currentItemId)) {
            return currentItemId;
          }

          updateCraftWorkspace((current) => ({
            ...current,
            selectedItemId: null,
          }));
          return null;
        });
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
    setSelectedItemId(item.id);
    setLastCalculationItemId(item.id);
    recordRecentItem(item.id);
    updateCraftWorkspace((current) => ({
      ...current,
      selectedItemId: item.id,
    }));
    setIsCatalogOpen(false);
  }

  function openPreloadedCraftingItem(item: Item) {
    selectItem(item);
    navigateTo("crafting");
  }

  function showGuidedStart() {
    setSelectedItemId(null);
    setIsCatalogOpen(false);
  }

  function restoreLastCalculation() {
    if (lastCalculationItem) selectItem(lastCalculationItem);
  }

  function openRecentSearch(search: RecentCatalogSearch) {
    setCatalogSearchRequest((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      query: search.query,
      category: search.category,
    }));
    setIsCatalogOpen(true);
  }

  function runCraftingExample(item: Item, example: GuidedCraftingExample) {
    const enchantment = 0 as const;
    const quantity = example === "return" ? 10 : 1;
    const currentStore = useCraftTreeStore.getState();
    const productionConfig = {
      ...currentStore.productionConfig,
      hasSpecialtyBonus: example === "return",
      specialtyKind: "crafting" as const,
      useFocus: example === "return",
      hasDailyBonus: false,
      dailyBonusAmount: 0.1 as const,
      isIsland: false,
      isHideout: false,
      hideoutSpecialized: false,
    };

    currentStore.setProductionConfig(productionConfig);
    if (example === "return") currentStore.setIsPremium(true);

    updateCraftWorkspace((current) => {
      const enchantmentsByItem = new Map(current.enchantmentsByItem);
      enchantmentsByItem.set(item.id, enchantment);
      const quantitiesByRoot = new Map(current.quantitiesByRoot);
      quantitiesByRoot.set(`${item.id}@${enchantment}`, quantity);

      return {
        ...current,
        selectedItemId: item.id,
        enchantmentsByItem,
        quantitiesByRoot,
        productionConfig,
        isPremium: example === "return" ? true : current.isPremium,
      };
    });

    setSelectedItemId(item.id);
    setLastCalculationItemId(item.id);
    recordRecentItem(item.id);
    navigateTo("crafting");
  }

  function openBlackMarket(view: BlackMarketView) {
    setBlackMarketView(view);
    navigateTo("black-market");
  }

  function runBlackMarketExample(item: Item) {
    const workspace = loadBlackMarketWorkspace();
    saveBlackMarketWorkspace({
      ...workspace,
      selectedItemId: item.id,
      enchantment: 0,
      quality: 1,
      quantity: 1,
      salesTaxPercent: 4,
      transportCost: 0,
    });
    recordRecentItem(item.id);
    openBlackMarket("single");
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
            selectedId={selectedItemId}
            searchRequest={catalogSearchRequest}
            onSelect={selectItem}
            onRecordSearch={(query, category) =>
              recordRecentSearch({ query, category })
            }
          />
        </Suspense>
      ) : (
        <SidebarFallback />
      )
    ) : undefined;

  return (
    <>
      <RouteSeo route={route} />
      <AppShell
        header={header}
        sidebar={catalog}
        sidebarLabel="Catálogo de crafteo"
        isSidebarOpen={isCatalogOpen}
        onCloseSidebar={() => setIsCatalogOpen(false)}
      >
        {route === "guides" && (
          <Suspense fallback={<ModuleFallback label="guías" />}>
            <GuidesHubPage />
          </Suspense>
        )}
        {isSeoGuideRoute(route) && (
          <Suspense fallback={<ModuleFallback label="guía" />}>
            <SeoGuidePage route={route} />
          </Suspense>
        )}
        {route === "crafting" && (
          <>
            <ModuleHeader
              eyebrow="Módulo de crafteo"
              title="Calculadora de producción"
              description="Selecciona un objeto, configura las condiciones de producción y compara materiales, retorno, costos y rentabilidad antes de craftear."
              actions={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selectedItem && (
                    <button
                      type="button"
                      onClick={showGuidedStart}
                      className="inline-flex items-center rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                    >
                      Inicio guiado
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCatalogOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border lg:hidden"
                  >
                    <CatalogIcon className="h-4 w-4" />
                    Explorar catálogo
                  </button>
                </div>
              }
            />
            {repositoryError ? (
              <RepositoryError message={repositoryError} />
            ) : selectedItem && repository ? (
              <ItemDetailPanel
                key={selectedItem.id}
                item={selectedItem}
                repository={repository}
              />
            ) : selectedItemId ? (
              <ModuleFallback label="calculadora de producción" />
            ) : repository ? (
              <EmptyDetailState
                repository={repository}
                lastCalculationItem={lastCalculationItem}
                onBrowseCatalog={() => setIsCatalogOpen(true)}
                onOpenItem={selectItem}
                onRunCraftingExample={runCraftingExample}
                onRunBlackMarketExample={runBlackMarketExample}
                onOpenBlackMarket={() => openBlackMarket("single")}
                onCompareCities={() => openBlackMarket("scanner")}
                onOpenRefining={() => navigateModule("refining")}
                onRestoreLastCalculation={restoreLastCalculation}
                onOpenRecentSearch={openRecentSearch}
              />
            ) : (
              <ModuleFallback label="inicio guiado" />
            )}
          </>
        )}
        {route === "refining" && (
          <>
            <ModuleHeader
              eyebrow="Módulo de refinamiento"
              title="Calculadora de refinamiento"
              description="Selecciona un recurso T2–T8 y compara materiales, retorno, foco, tarifa de estación, beneficio, ROI y precio de equilibrio."
            />
            {repositoryError ? (
              <RepositoryError message={repositoryError} />
            ) : repository ? (
              <Suspense fallback={<ModuleFallback label="refinamiento" />}>
                <RefiningCalculatorPage repository={repository} />
              </Suspense>
            ) : (
              <ModuleFallback label="refinamiento" />
            )}
          </>
        )}
        {route === "black-market" && (
          <>
            <ModuleHeader
              eyebrow="Mercado especial de Caerleon"
              title={
                blackMarketView === "single"
                  ? "Comparación individual con el Black Market"
                  : "Black Market Opportunity Scanner"
              }
              description={
                blackMarketView === "single"
                  ? "Selecciona un objeto concreto y compara su costo de compra con la orden observada en el Black Market, descontando tax y transporte."
                  : "Descubre comparaciones rentables entre ciudades y órdenes de compra del Black Market; abre cada resultado para validar su detalle económico e histórico."
              }
              badge="Pro"
              actions={
                <div className="flex flex-wrap rounded-xl border border-border bg-surface-raised p-1">
                  <button
                    type="button"
                    onClick={() => setBlackMarketView("single")}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
                      blackMarketView === "single"
                        ? "bg-accent text-bg"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    Comparar un objeto
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlackMarketView("scanner")}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
                      blackMarketView === "scanner"
                        ? "bg-accent text-bg"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    Comparar ciudades
                  </button>
                </div>
              }
            />
            {repositoryError ? (
              <RepositoryError message={repositoryError} />
            ) : repository ? (
              <Suspense fallback={<ModuleFallback label="Black Market" />}>
                {blackMarketView === "single" ? (
                  <BlackMarketPage
                    key={loadBlackMarketWorkspace().selectedItemId ?? "empty"}
                    repository={repository}
                    onNavigate={navigateTo}
                  />
                ) : (
                  <BlackMarketOpportunityScannerPage
                    repository={repository}
                    onNavigate={navigateTo}
                    onOpenCrafting={openPreloadedCraftingItem}
                  />
                )}
              </Suspense>
            ) : (
              <ModuleFallback label="Black Market" />
            )}
          </>
        )}
        {route === "presets" && (
          <>
            <ModuleHeader
              eyebrow="Biblioteca de la cuenta"
              title="Presets e historial"
              description="Administra configuraciones reutilizables y capturas completas de cálculos. Con una cuenta iniciada, la biblioteca se sincroniza entre dispositivos."
            />
            <Suspense fallback={<ModuleFallback label="biblioteca" />}>
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
    </>
  );
}

export default App;
