import { PUBLIC_ENV } from '@shared/config/publicEnv'

const WARMUP_TIMEOUT_MS = 5_000

/**
 * Dispara una solicitud no bloqueante a /healthz tan pronto como arranca la app.
 * En un Render gratuito esto puede iniciar el proceso antes de que el usuario
 * llegue a una consulta de precios. El resultado no controla ningún render ni
 * reemplaza el fallback/caché del mercado.
 */
export async function warmCentralMarketApi(): Promise<void> {
  let healthUrl: string

  try {
    const apiUrl = new URL(PUBLIC_ENV.centralMarketApiUrl)
    healthUrl = new URL('/healthz', apiUrl.origin).toString()
  } catch {
    return
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS)

  try {
    await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
  } catch {
    // Es una optimización best-effort. La lectura de mercado conserva su propio
    // timeout, fallback y mensajes de error.
  } finally {
    window.clearTimeout(timeoutId)
  }
}
