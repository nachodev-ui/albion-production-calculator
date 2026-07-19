import type { MouseEvent } from "react";
import type { AppModule, AppRoute } from "./types";
import { isGuidesSectionRoute } from "./types";
import {
  BlackMarketIcon,
  CatalogIcon,
  HammerIcon,
  PresetIcon,
  RefiningIcon,
} from "./AppIcons";

interface MainNavigationProps {
  readonly activeRoute?: AppRoute;
  readonly activeModule?: AppModule;
  readonly onNavigate: (route: AppRoute) => void;
}

const NAV_ITEMS = [
  {
    id: "crafting" as const,
    href: "/",
    label: "Crafteo",
    description: "Costos y rentabilidad",
    icon: HammerIcon,
  },
  {
    id: "refining" as const,
    href: "/refining",
    label: "Refinamiento",
    description: "Próximamente",
    icon: RefiningIcon,
    badge: "Próximamente",
  },
  {
    id: "black-market" as const,
    href: "/black-market",
    label: "Black Market",
    description: "Rutas y oportunidades",
    icon: BlackMarketIcon,
    badge: "Pro",
  },
  {
    id: "presets" as const,
    href: "/presets",
    label: "Presets",
    description: "Configuraciones guardadas",
    icon: PresetIcon,
  },
  {
    id: "guides" as const,
    href: "/guias",
    label: "Guías",
    description: "Economía y fórmulas",
    icon: CatalogIcon,
  },
] as const;

export function MainNavigation({
  activeRoute,
  activeModule,
  onNavigate,
}: MainNavigationProps) {
  const resolvedRoute = activeRoute ?? activeModule ?? "crafting";

  function navigate(
    event: MouseEvent<HTMLAnchorElement>,
    route: AppRoute,
  ): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(route);
  }

  return (
    <nav aria-label="Navegación principal" className="min-w-0">
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-bg/45 p-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.id === "guides"
              ? isGuidesSectionRoute(resolvedRoute)
              : resolvedRoute === item.id;
          const Icon = item.icon;

          return (
            <a
              key={item.id}
              href={item.href}
              onClick={(event) => navigate(event, item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border sm:px-4 ${
                isActive
                  ? "bg-surface-raised text-text shadow-sm"
                  : "text-text-muted hover:bg-surface/70 hover:text-text"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive
                    ? "text-accent"
                    : "text-text-faint group-hover:text-text-muted"
                }`}
              />

              <span className="flex min-w-0 flex-col leading-tight">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {item.label}
                  {"badge" in item && item.badge && (
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
            </a>
          );
        })}
      </div>
    </nav>
  );
}
