import { FetchJsonError } from '@shared/http/fetchJson'
import {
  MarketSourceCooldownError,
  type MarketNetworkSource,
} from './marketSourceCooldown'

export type MarketErrorSource = MarketNetworkSource | 'browser-cache' | 'unknown'

interface DescribeMarketErrorOptions {
  readonly source?: MarketErrorSource
  readonly fallback?: string
}

const SOURCE_LABELS: Record<MarketErrorSource, string> = {
  'central-api': 'API central',
  'local-receiver': 'receiver local',
  'browser-cache': 'caché del navegador',
  unknown: 'fuente de mercado',
}

function sourceLabel(source: MarketErrorSource | undefined): string {
  return SOURCE_LABELS[source ?? 'unknown']
}

function formatCooldownRemaining(remainingMs: number): string {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000))
  if (seconds < 60) return `${seconds}s`

  return `${Math.ceil(seconds / 60)}min`
}

function describeHttpStatus(status: number | undefined): string {
  if (status === 401 || status === 403) {
    return 'rechazó la consulta por permisos o configuración de acceso'
  }

  if (status === 404) {
    return 'no encontró el recurso solicitado'
  }

  if (status === 408) {
    return 'agotó el tiempo de espera'
  }

  if (status === 429) {
    return 'limitó temporalmente las consultas'
  }

  if (status && status >= 500) {
    return `respondió con error temporal ${status}`
  }

  return status
    ? `respondió con error HTTP ${status}`
    : 'respondió con error HTTP'
}

export function isMarketRequestAbort(error: unknown): boolean {
  if (error instanceof FetchJsonError) return error.category === 'abort'
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }
  return error instanceof Error && error.name === 'AbortError'
}

export function describeMarketError(
  error: unknown,
  options: DescribeMarketErrorOptions = {},
): string {
  const label = sourceLabel(options.source)

  if (error instanceof MarketSourceCooldownError) {
    return `${sourceLabel(error.source)} está en cooldown temporal por ${formatCooldownRemaining(error.remainingMs)}. Se omitió esta fuente para evitar insistir contra una caída reciente.`
  }

  if (error instanceof FetchJsonError) {
    switch (error.category) {
      case 'abort':
        return 'La consulta anterior fue cancelada porque hay una solicitud más reciente.'
      case 'timeout':
        return `${label} tardó demasiado en responder. Puedes reintentar o usar otra fuente mientras se recupera.`
      case 'network':
        return `${label} no responde o hay un problema de red local. Revisa que el servicio esté levantado y vuelve a intentar.`
      case 'http':
        return `${label} ${describeHttpStatus(error.status)}. La calculadora intentará usar otra fuente si está disponible.`
      case 'invalid-json':
        return `${label} respondió con datos inválidos. La calculadora intentará usar otra fuente o caché.`
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return options.fallback ?? 'No fue posible completar la consulta de mercado.'
}

export function describeMarketFallbackWarning(
  source: MarketNetworkSource,
  error: unknown,
): string {
  return `${sourceLabel(source)} no disponible: ${describeMarketError(error, {
    source,
  })}`
}

export function describeMarketCacheFallback(kind: 'catalog' | 'prices' | 'history') {
  if (kind === 'catalog') {
    return 'Se usó el catálogo guardado en este navegador porque las fuentes de red no respondieron.'
  }

  if (kind === 'history') {
    return 'Se usó historial guardado en este navegador porque las fuentes de red no respondieron o no tenían datos útiles.'
  }

  return 'Se mantienen precios guardados en este navegador porque las fuentes de red no respondieron.'
}

export function describeNoMarketData(kind: 'prices' | 'history'): string {
  return kind === 'history'
    ? 'Las fuentes respondieron, pero no hay ventas históricas para esta combinación de ciudad, calidad e ítem.'
    : 'Las fuentes respondieron, pero no hay precios disponibles para esta combinación de ciudad, calidad e ítem.'
}
