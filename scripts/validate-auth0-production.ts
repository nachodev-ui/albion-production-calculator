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
const scope = (process.env.VITE_AUTH0_SCOPE ?? 'openid profile email').trim()

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
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
  assert(
    enabledValue === 'true' || enabledValue === 'false',
    'VITE_AUTH0_ENABLED must be true or false',
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

  const requestedScopes = new Set(scope.split(/\s+/).filter(Boolean))
  for (const requiredScope of ['openid', 'profile', 'email']) {
    assert(requestedScopes.has(requiredScope), `Missing required scope: ${requiredScope}`)
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

  console.log(`Auth0 production configuration is valid for ${issuer}`)
  console.log(`Audience: ${audience}`)
  console.log(`SPA Client ID: ${clientId}`)
}

await main()
