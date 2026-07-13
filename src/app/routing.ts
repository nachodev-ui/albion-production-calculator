import { useCallback, useEffect, useState } from "react";
import type { AppRoute } from "./types";

const ROUTE_PATHS: Readonly<Record<AppRoute, string>> = {
  crafting: "/",
  refining: "/refining",
  presets: "/presets",
  plans: "/plans",
  account: "/account",
};

function currentPathname(): string {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function routeFromPathname(pathname: string): AppRoute {
  switch (pathname.replace(/\/+$/, "") || "/") {
    case "/refining":
      return "refining";
    case "/presets":
      return "presets";
    case "/plans":
      return "plans";
    case "/account":
      return "account";
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
