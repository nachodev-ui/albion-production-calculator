export type AppModule = 'crafting' | 'refining' | 'presets'
export type AppRoute = AppModule | 'plans' | 'account'

export function isAppModule(route: AppRoute): route is AppModule {
  return route === 'crafting' || route === 'refining' || route === 'presets'
}
