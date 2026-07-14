interface DiscoveryDocument {
  readonly issuer?: unknown
  readonly authorization_endpoint?: unknown
  readonly token_endpoint?: unknown
  readonly jwks_uri?: unknown
}

interface JwksDocument {
  readonly keys?: unknown
}

const enabledValue = (process.env.VITE_AUTH0_ENABLED ?? 'false')
  .trim()
  .toLowerCase()
const domain = (process.env.VITE_AUTH0_DOMAIN ?? '').trim()
const clientId = (process.env.VITE_AUTH0_CLIENT_ID ?? '').trim()
const audience = (process.env.VITE_AUTH0_AUDIENCE ?? '').trim()
const configuredScope = (
  process.env.VITE_AUTH0_SCOPE ?? 'openid profile email read:account'
).trim()
const cacheLocation = (
  process.env.VITE_AUTH0_CACHE_LOCATION ?? 'localstorage'
).trim().toLowerCase()
const useRefreshTokensValue = (
  process.env.VITE_AUTH0_USE_REFRESH_TOKENS ?? 'true'
).trim().toLowerCase()
const useRefreshTokensFallbackValue = (
  process.env.VITE_AUTH0_USE_REFRESH_TOKENS_FALLBACK ?? 'true'
).trim().toLowerCase()

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertBoolean(value: string, field: string): void {
  assert(value === 'true' || value === 'false', `${field} must be true or false`)
}

function endpointHost(value: unknown, field: string): string {
  assert(typeof value === 'string' && value.length > 0, `${field} is missing`)
  const endpoint = new URL(value)
  assert(endpoint.protocol === 'https:', `${field} must use HTTPS`)
  return endpoint.host
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  assert(response.ok, `${url} returned HTTP ${response.status}`)
  return (await response.json()) as T
}

async function main(): Promise<void> {
  assertBoolean(enabledValue, 'VITE_AUTH0_ENABLED')
  assertBoolean(useRefreshTokensValue, 'VITE_AUTH0_USE_REFRESH_TOKENS')
  assertBoolean(
    useRefreshTokensFallbackValue,
    'VITE_AUTH0_USE_REFRESH_TOKENS_FALLBACK',
  )
  assert(
    cacheLocation === 'memory' || cacheLocation === 'localstorage',
    'VITE_AUTH0_CACHE_LOCATION must be memory or localstorage',
  )

  if (enabledValue === 'false') {
    console.log('Auth0 production activation is disabled.')
    return
  }

  assert(domain.length > 0, 'VITE_AUTH0_DOMAIN is required when Auth0 is enabled')
  assert(
    !domain.startsWith('http://') && !domain.startsWith('https://'),
    'VITE_AUTH0_DOMAIN must not include a protocol',
  )
  assert(!domain.includes('/'), 'VITE_AUTH0_DOMAIN must not include a path')
  assert(clientId.length > 0, 'VITE_AUTH0_CLIENT_ID is required when Auth0 is enabled')
  assert(audience.length > 0, 'VITE_AUTH0_AUDIENCE is required when Auth0 is enabled')

  const audienceUrl = new URL(audience)
  assert(audienceUrl.protocol === 'https:', 'VITE_AUTH0_AUDIENCE must use HTTPS')

  const requestedScopes = new Set(configuredScope.split(/\s+/).filter(Boolean))
  if (useRefreshTokensValue === 'true') requestedScopes.add('offline_access')

  for (const requiredScope of ['openid', 'profile', 'email', 'read:account']) {
    assert(requestedScopes.has(requiredScope), `Missing required scope: ${requiredScope}`)
  }

  if (useRefreshTokensValue === 'true') {
    assert(
      requestedScopes.has('offline_access'),
      'offline_access is required when refresh tokens are enabled',
    )
  }
  if (useRefreshTokensFallbackValue === 'true') {
    assert(
      useRefreshTokensValue === 'true',
      'Refresh-token fallback requires VITE_AUTH0_USE_REFRESH_TOKENS=true',
    )
  }

  const issuer = `https://${domain}/`
  const discoveryUrl = `${issuer}.well-known/openid-configuration`
  const discovery = await readJson<DiscoveryDocument>(discoveryUrl)

  assert(discovery.issuer === issuer, 'Auth0 discovery issuer does not match the configured domain')
  assert(
    endpointHost(discovery.authorization_endpoint, 'authorization_endpoint') === domain,
    'authorization_endpoint must use the configured Auth0 domain',
  )
  assert(
    endpointHost(discovery.token_endpoint, 'token_endpoint') === domain,
    'token_endpoint must use the configured Auth0 domain',
  )
  assert(
    endpointHost(discovery.jwks_uri, 'jwks_uri') === domain,
    'jwks_uri must use the configured Auth0 domain',
  )

  const jwks = await readJson<JwksDocument>(discovery.jwks_uri as string)
  assert(Array.isArray(jwks.keys) && jwks.keys.length > 0, 'Auth0 JWKS contains no signing keys')

  const effectiveScope = [...requestedScopes].join(' ')
  console.log(`Auth0 production configuration is valid for ${issuer}`)
  console.log(`Audience: ${audience}`)
  console.log(`SPA Client ID: ${clientId}`)
  console.log(`Scopes: ${effectiveScope}`)
  console.log(`Cache location: ${cacheLocation}`)
  console.log(`Refresh tokens: ${useRefreshTokensValue}`)
  console.log(`Refresh-token fallback: ${useRefreshTokensFallbackValue}`)
}

await main()
