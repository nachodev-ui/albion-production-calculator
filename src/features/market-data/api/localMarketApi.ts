import type { AlbionServer } from '../types/MarketPrice'

/**
 * API central de lectura. La variable nueva evita interpretar como central el
 * antiguo VITE_MARKET_API_URL, que históricamente apuntaba al receiver :8787.
 */
export const CENTRAL_MARKET_API_URL = (
  import.meta.env['VITE_CENTRAL_MARKET_API_URL'] ??
  'http://127.0.0.1:8080/api/v1'
).replace(/\/$/, '')

/**
 * Receiver local. Se conserva VITE_MARKET_API_URL como alias legado para que
 * los .env existentes sigan funcionando sin cambios inmediatos.
 */
export const LOCAL_MARKET_API_URL = (
  import.meta.env['VITE_LOCAL_MARKET_API_URL'] ??
  import.meta.env['VITE_MARKET_API_URL'] ??
  'http://127.0.0.1:8787/api/v1'
).replace(/\/$/, '')

export const MARKET_SERVER_IDS: Record<AlbionServer, string> = {
  americas: 'west',
  asia: 'east',
  europe: 'europe',
}

/** @deprecated Use MARKET_SERVER_IDS. */
export const LOCAL_SERVER_IDS = MARKET_SERVER_IDS
