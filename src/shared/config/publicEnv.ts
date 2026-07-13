const DEFAULT_CENTRAL_MARKET_API_URL = 'http://127.0.0.1:8080/api/v1'
const DEFAULT_LOCAL_MARKET_API_URL = 'http://127.0.0.1:8787/api/v1'
const DEFAULT_MARKET_REQUEST_TIMEOUT_MS = 7_000
const DEFAULT_LOCAL_RECEIVER_FALLBACK_ENABLED = false

const MIN_TIMEOUT_MS = 1_000
const MAX_TIMEOUT_MS = 30_000

const ALLOWED_PUBLIC_ENV_KEYS = new Set([
  'VITE_CENTRAL_MARKET_API_URL',
  'VITE_ENABLE_LOCAL_RECEIVER_FALLBACK',
  'VITE_LOCAL_MARKET_API_URL',
  'VITE_MARKET_API_URL',
  'VITE_MARKET_REQUEST_TIMEOUT_MS',
  'VITE_AUTH0_ENABLED',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
  'VITE_AUTH0_SCOPE',
  'VITE_BILLING_ENABLED',
])

const SENSITIVE_ENV_KEY_PATTERN =
  /(SECRET|TOKEN|PASSWORD|PASS|PRIVATE|API_KEY|BEARER|CREDENTIAL|CLIENT_SECRET)/i

function readPublicEnv(key: string): string | undefined {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}

function assertNoUnexpectedViteEnv(): void {
  for (const key of Object.keys(import.meta.env)) {
    if (!key.startsWith('VITE_')) continue

    if (!ALLOWED_PUBLIC_ENV_KEYS.has(key)) {
      throw new Error(`Variable pública VITE_* no permitida: ${key}`)
    }

    if (SENSITIVE_ENV_KEY_PATTERN.test(key)) {
      throw new Error(
        `Variable pública rechazada por posible credencial: ${key}`,
      )
    }
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

function normalizeApiBaseUrl({
  key,
  rawValue,
  fallback,
  localOnly,
}: {
  readonly key: string
  readonly rawValue: string | undefined
  readonly fallback: string
  readonly localOnly: boolean
}): string {
  const candidate = rawValue ?? fallback
  let url: URL

  try {
    url = new URL(candidate)
  } catch {
    throw new Error(`${key} debe ser una URL absoluta válida`)
  }

  if (url.username || url.password) {
    throw new Error(`${key} no puede contener credenciales`)
  }
  if (url.search || url.hash) {
    throw new Error(`${key} no puede contener query string ni fragmento`)
  }

  const isLoopback = isLoopbackHostname(url.hostname)
  if (localOnly && !isLoopback) {
    throw new Error(`${key} solo puede apuntar a loopback`)
  }
  if (!localOnly && url.protocol !== 'https:' && !isLoopback) {
    throw new Error(`${key} debe usar HTTPS fuera de loopback`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${key} debe usar HTTP o HTTPS`)
  }

  return url.toString().replace(/\/+$/, '')
}

function parseBoolean(key: string, fallback: boolean): boolean {
  const value = readPublicEnv(key)
  if (value === undefined) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${key} debe ser true o false`)
}

function parseTimeout(): number {
  const value = readPublicEnv('VITE_MARKET_REQUEST_TIMEOUT_MS')
  if (value === undefined) return DEFAULT_MARKET_REQUEST_TIMEOUT_MS

  const parsed = Number(value)
  if (
    !Number.isInteger(parsed) ||
    parsed < MIN_TIMEOUT_MS ||
    parsed > MAX_TIMEOUT_MS
  ) {
    throw new Error(
      `VITE_MARKET_REQUEST_TIMEOUT_MS debe estar entre ${MIN_TIMEOUT_MS} y ${MAX_TIMEOUT_MS}`,
    )
  }
  return parsed
}

assertNoUnexpectedViteEnv()

const localReceiverFallbackEnabled = parseBoolean(
  'VITE_ENABLE_LOCAL_RECEIVER_FALLBACK',
  DEFAULT_LOCAL_RECEIVER_FALLBACK_ENABLED,
)

export const publicEnv = Object.freeze({
  centralMarketApiUrl: normalizeApiBaseUrl({
    key: 'VITE_CENTRAL_MARKET_API_URL',
    rawValue: readPublicEnv('VITE_CENTRAL_MARKET_API_URL'),
    fallback: DEFAULT_CENTRAL_MARKET_API_URL,
    localOnly: false,
  }),
  localMarketApiUrl: normalizeApiBaseUrl({
    key: 'VITE_LOCAL_MARKET_API_URL',
    rawValue:
      readPublicEnv('VITE_LOCAL_MARKET_API_URL') ??
      readPublicEnv('VITE_MARKET_API_URL'),
    fallback: DEFAULT_LOCAL_MARKET_API_URL,
    localOnly: true,
  }),
  marketRequestTimeoutMs: parseTimeout(),
  localReceiverFallbackEnabled,
})
