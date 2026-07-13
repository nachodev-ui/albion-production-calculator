import { useCallback, useEffect, useState } from 'react'
import type { AppRoute } from './types'

const ROUTE_PATHS: Readonly<Record<AppRoute, string>> = {
  crafting: '/',
  refining: '/refining',
  presets: '/presets',
  plans: '/plans',
  account: '/account',
}

export function routeFromPathname(pathname: string): AppRoute {
  switch (pathname.replace(/\/+$/, '') || '/') {
    case '/refining':
      return 'refining'
    case '/presets':
      return 'presets'
    case '/plans':
      return 'plans'
    case '/account':
      return 'account'
    case '/crafting':
    case '/':
    default:
      return 'crafting'
  }
}

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    routeFromPathname(window.location.pathname),
  )

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromPathname(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((nextRoute: AppRoute) => {
    const nextPath = ROUTE_PATHS[nextRoute]
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
    setRoute(nextRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { route, navigate }
}
