export type AppModule =
  | "crafting"
  | "refining"
  | "black-market"
  | "presets";
export type AppRoute = AppModule | "plans" | "account" | "profile" | "admin";

export function isAppModule(route: AppRoute): route is AppModule {
  return (
    route === "crafting" ||
    route === "refining" ||
    route === "black-market" ||
    route === "presets"
  );
}
