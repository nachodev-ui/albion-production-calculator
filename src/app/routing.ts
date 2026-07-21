import { useCallback, useEffect, useState } from "react";
import type { AppRoute } from "./types";

const ROUTE_PATHS: Readonly<Record<AppRoute, string>> = {
  crafting: "/",
  refining: "/refining",
  "black-market": "/black-market",
  presets: "/presets",
  guides: "/guias",
  plans: "/plans",
  account: "/account",
  profile: "/profile",
  admin: "/admin",
  "guide-crafting-profit": "/guias/rentabilidad-crafteo-albion-online",
  "guide-resource-return-rate":
    "/guias/retorno-materiales-rrr-albion-online",
  "guide-black-market-profit": "/guias/black-market-caerleon-rentable",
};

function currentPathname(): string {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function routeFromPathname(pathname: string): AppRoute {
  switch (pathname.replace(/\/+$/, "") || "/") {
    case "/refining":
      return "refining";
    case "/black-market":
      return "black-market";
    case "/presets":
      return "presets";
    case "/guias":
    case "/estado-datos":
      return "guides";
    case "/plans":
      return "plans";
    case "/account":
      return "account";
    case "/profile":
      return "profile";
    case "/admin":
      return "admin";
    case "/guias/rentabilidad-crafteo-albion-online":
      return "guide-crafting-profit";
    case "/guias/retorno-materiales-rrr-albion-online":
      return "guide-resource-return-rate";
    case "/guias/black-market-caerleon-rentable":
      return "guide-black-market-profit";
    case "/crafting":
    case "/":
    default:
      return "crafting";
  }
}

export function navigateToRoute(nextRoute: AppRoute, replace = false): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextPath = ROUTE_PATHS[nextRoute];
  if (window.location.pathname !== nextPath) {
    if (replace) {
      window.history.replaceState({}, "", nextPath);
    } else {
      window.history.pushState({}, "", nextPath);
    }
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    routeFromPathname(currentPathname()),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePopState = () =>
      setRoute(routeFromPathname(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute) => {
    navigateToRoute(nextRoute);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return { route, navigate };
}
