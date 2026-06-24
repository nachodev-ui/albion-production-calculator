import type { AlbionServer } from '../types/MarketPrice'

export const LOCAL_MARKET_API_URL = (
  import.meta.env['VITE_MARKET_API_URL'] ??
  'http://127.0.0.1:8787/api/v1'
).replace(/\/$/, '')

export const LOCAL_SERVER_IDS: Record<AlbionServer, string> = {
  americas: 'west',
  asia: 'east',
  europe: 'europe',
}
