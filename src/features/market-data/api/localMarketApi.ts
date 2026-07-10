import { PUBLIC_ENV } from '@shared/config/publicEnv'
import type { AlbionServer } from '../types/MarketPrice'

/**
 * API central de lectura.
 * No debe contener credenciales: toda variable VITE_* queda expuesta al bundle.
 */
export const CENTRAL_MARKET_API_URL = PUBLIC_ENV.centralMarketApiUrl

/**
 * Receiver local opcional para desarrollo y diagnóstico de colaboradores.
 * La aplicación pública no lo consulta salvo activación explícita.
 */
export const LOCAL_RECEIVER_FALLBACK_ENABLED =
  PUBLIC_ENV.localReceiverFallbackEnabled

/**
 * Receiver local.
 * Se conserva VITE_MARKET_API_URL como alias legado, validado desde publicEnv.
 */
export const LOCAL_MARKET_API_URL = PUBLIC_ENV.localMarketApiUrl

export const MARKET_REQUEST_TIMEOUT_MS = PUBLIC_ENV.marketRequestTimeoutMs

export const MARKET_SERVER_IDS: Record<AlbionServer, string> = {
  americas: 'west',
  asia: 'east',
  europe: 'europe',
}

/** @deprecated Use MARKET_SERVER_IDS. */
export const LOCAL_SERVER_IDS = MARKET_SERVER_IDS
