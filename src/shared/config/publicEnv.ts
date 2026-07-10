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
])

const SENSITIVE_ENV_KEY_PATTERN =
  /(SECRET|TOKEN|PASSWORD|PASS|PRIVATE|API_KEY|AUTH|BEARER|JWT|CREDENTIAL)/i

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
  requireHttps = false,
}: {
  readonly key: string
  readonly rawValue: string | undefined
  readonly fallback: string
  readonly requireHttps?: boolean
}): string {
  if (requireHttps && !rawValue) {
    throw new Error(`${key} es obligatoria para compilar el frontend en producción`)
  }

  const value = rawValue ?? fallback

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${key} debe ser una URL absoluta válida`)
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${key} no debe contener usuario ni contraseña`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${key} debe usar http o https`)
  }

  if (requireHttps && parsed.protocol !== 'https:') {
    throw new Error(`${key} debe usar HTTPS en producción`)
  }

  if (parsed.protocol === 'http:' && !isLoopbackHostname(parsed.hostname)) {
    throw new Error(`${key} solo puede usar http en localhost/127.0.0.1`)
  }

  const normalized = parsed.toString().replace(/\/$/, '')
  if (!normalized.endsWith('/api/v1')) {
    throw new Error(`${key} debe apuntar a una base URL terminada en /api/v1`)
  }

  return normalized
}

function normalizeBoolean(
  key: string,
  rawValue: string | undefined,
  fallback: boolean,
): boolean {
  if (!rawValue) return fallback
  if (rawValue === 'true') return true
  if (rawValue === 'false') return false

  throw new Error(`${key} debe ser true o false`)
}

function normalizeTimeoutMs(rawValue: string | undefined): number {
  if (!rawValue) return DEFAULT_MARKET_REQUEST_TIMEOUT_MS

  const parsed = Number(rawValue)
  if (!Number.isInteger(parsed)) {
    throw new Error('VITE_MARKET_REQUEST_TIMEOUT_MS debe ser un entero')
  }

  if (parsed < MIN_TIMEOUT_MS || parsed > MAX_TIMEOUT_MS) {
    throw new Error(
      `VITE_MARKET_REQUEST_TIMEOUT_MS debe estar entre ${MIN_TIMEOUT_MS} y ${MAX_TIMEOUT_MS}`,
    )
  }

  return parsed
}

assertNoUnexpectedViteEnv()

const localReceiverFallbackEnabled = normalizeBoolean(
  'VITE_ENABLE_LOCAL_RECEIVER_FALLBACK',
  readPublicEnv('VITE_ENABLE_LOCAL_RECEIVER_FALLBACK'),
  DEFAULT_LOCAL_RECEIVER_FALLBACK_ENABLED,
)

if (import.meta.env.PROD && localReceiverFallbackEnabled) {
  throw new Error(
    'VITE_ENABLE_LOCAL_RECEIVER_FALLBACK debe ser false en builds de producción',
  )
}

export const PUBLIC_ENV = {
  centralMarketApiUrl: normalizeApiBaseUrl({
    key: 'VITE_CENTRAL_MARKET_API_URL',
    rawValue: readPublicEnv('VITE_CENTRAL_MARKET_API_URL'),
    fallback: DEFAULT_CENTRAL_MARKET_API_URL,
    requireHttps: import.meta.env.PROD,
  }),
  localReceiverFallbackEnabled,
  localMarketApiUrl: normalizeApiBaseUrl({
    key: 'VITE_LOCAL_MARKET_API_URL',
    rawValue:
      readPublicEnv('VITE_LOCAL_MARKET_API_URL') ??
      readPublicEnv('VITE_MARKET_API_URL'),
    fallback: DEFAULT_LOCAL_MARKET_API_URL,
  }),
  marketRequestTimeoutMs: normalizeTimeoutMs(
    readPublicEnv('VITE_MARKET_REQUEST_TIMEOUT_MS'),
  ),
} as const
