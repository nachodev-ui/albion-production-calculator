export type AppModule =
  | "crafting"
  | "refining"
  | "black-market"
  | "presets";

export type SeoGuideRoute =
  | "guide-crafting-profit"
  | "guide-resource-return-rate"
  | "guide-black-market-profit";

export type AppRoute =
  | AppModule
  | SeoGuideRoute
  | "plans"
  | "account"
  | "profile"
  | "admin";

export function isAppModule(route: AppRoute): route is AppModule {
  return (
    route === "crafting" ||
    route === "refining" ||
    route === "black-market" ||
    route === "presets"
  );
}

export function isSeoGuideRoute(route: AppRoute): route is SeoGuideRoute {
  return route.startsWith("guide-");
}
