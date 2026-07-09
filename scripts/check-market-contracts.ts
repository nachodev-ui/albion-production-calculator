import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

type HttpMethod = 'get' | 'post'

interface OpenApiDocument {
  readonly paths?: Record<string, Record<string, unknown>>
  readonly components?: {
    readonly parameters?: Record<string, unknown>
  }
}

interface OperationObject {
  readonly parameters?: readonly unknown[]
  readonly responses?: unknown
}

interface QueryParamExpectation {
  readonly path: string
  readonly method: HttpMethod
  readonly requiredQueryParams?: readonly string[]
  readonly supportedQueryParams?: readonly string[]
}

interface ParameterObject {
  readonly name?: unknown
  readonly in?: unknown
  readonly required?: unknown
}

function loadContract(path: string): OpenApiDocument {
  const raw = readFileSync(path, 'utf8')
  const parsed = parse(raw) as OpenApiDocument

  if (!parsed || typeof parsed !== 'object' || !parsed.paths) {
    throw new Error(`Contrato inválido o sin paths: ${path}`)
  }

  return parsed
}

function resolveParameter(
  contract: OpenApiDocument,
  parameter: unknown,
): ParameterObject | undefined {
  if (!parameter || typeof parameter !== 'object') return undefined

  const candidate = parameter as ParameterObject & { readonly $ref?: unknown }

  if (typeof candidate.$ref !== 'string') {
    return candidate
  }

  const prefix = '#/components/parameters/'
  if (!candidate.$ref.startsWith(prefix)) {
    throw new Error(`Referencia de parámetro no soportada: ${candidate.$ref}`)
  }

  const parameterName = candidate.$ref.slice(prefix.length)
  const resolved = contract.components?.parameters?.[parameterName]

  if (!resolved || typeof resolved !== 'object') {
    throw new Error(`No se pudo resolver parámetro: ${candidate.$ref}`)
  }

  return resolved as ParameterObject
}

function getOperation(
  contractName: string,
  contract: OpenApiDocument,
  path: string,
  method: HttpMethod,
): OperationObject {
  const pathItem = contract.paths?.[path]
  if (!pathItem) {
    throw new Error(`${contractName}: falta ruta ${path}`)
  }

  const operation = pathItem[method] as OperationObject | undefined
  if (!operation) {
    throw new Error(`${contractName}: falta método ${method.toUpperCase()} ${path}`)
  }

  if (!operation.responses || typeof operation.responses !== 'object') {
    throw new Error(`${contractName}: ${method.toUpperCase()} ${path} no declara responses`)
  }

  return operation
}

function getQueryParameters(
  contract: OpenApiDocument,
  operation: OperationObject,
): readonly ParameterObject[] {
  if (!Array.isArray(operation.parameters)) return []

  return operation.parameters
    .map((parameter) => resolveParameter(contract, parameter))
    .filter((parameter): parameter is ParameterObject => Boolean(parameter))
    .filter((parameter) => parameter.in === 'query')
}

function assertSupportedQueryParams(
  contractName: string,
  contract: OpenApiDocument,
  operation: OperationObject,
  endpoint: QueryParamExpectation,
): void {
  const queryParameters = getQueryParameters(contract, operation)

  for (const paramName of endpoint.supportedQueryParams ?? []) {
    const exists = queryParameters.some((parameter) => parameter.name === paramName)

    if (!exists) {
      throw new Error(
        `${contractName}: ${endpoint.method.toUpperCase()} ${endpoint.path} no soporta query param "${paramName}"`,
      )
    }
  }
}

function assertRequiredQueryParams(
  contractName: string,
  contract: OpenApiDocument,
  operation: OperationObject,
  endpoint: QueryParamExpectation,
): void {
  const queryParameters = getQueryParameters(contract, operation)

  for (const paramName of endpoint.requiredQueryParams ?? []) {
    const exists = queryParameters.some(
      (parameter) =>
        parameter.name === paramName &&
        parameter.required === true,
    )

    if (!exists) {
      throw new Error(
        `${contractName}: ${endpoint.method.toUpperCase()} ${endpoint.path} no declara query param requerido "${paramName}"`,
      )
    }
  }
}

function assertEndpoint(
  contractName: string,
  contract: OpenApiDocument,
  endpoint: QueryParamExpectation,
): void {
  const operation = getOperation(
    contractName,
    contract,
    endpoint.path,
    endpoint.method,
  )

  assertSupportedQueryParams(contractName, contract, operation, endpoint)
  assertRequiredQueryParams(contractName, contract, operation, endpoint)
}

const centralApi = loadContract('contracts/central-api/openapi.yaml')
const localReceiver = loadContract('contracts/local-receiver/openapi.json')

const sharedReadEndpoints: readonly QueryParamExpectation[] = [
  {
    path: '/api/v1/markets',
    method: 'get',
  },
  {
    path: '/api/v1/prices',
    method: 'get',
  },
  {
    path: '/api/v1/history',
    method: 'get',
  },
]

const centralRequiredReadParams: readonly QueryParamExpectation[] = [
  {
    path: '/api/v1/prices',
    method: 'get',
    requiredQueryParams: ['server', 'marketKey', 'itemIds', 'quality'],
  },
  {
    path: '/api/v1/history',
    method: 'get',
    requiredQueryParams: ['server', 'marketKey', 'itemId', 'quality'],
  },
]

const receiverSupportedReadParams: readonly QueryParamExpectation[] = [
  {
    path: '/api/v1/prices',
    method: 'get',
    supportedQueryParams: ['server', 'marketKey', 'itemIds', 'quality'],
  },
  {
    path: '/api/v1/history',
    method: 'get',
    supportedQueryParams: ['server', 'marketKey', 'itemId', 'quality'],
  },
]

const centralOnlyBatchEndpoints: readonly QueryParamExpectation[] = [
  {
    path: '/api/v1/prices/query',
    method: 'post',
  },
  {
    path: '/api/v1/history/query',
    method: 'post',
  },
]

for (const endpoint of sharedReadEndpoints) {
  assertEndpoint('central-api', centralApi, endpoint)
  assertEndpoint('local-receiver', localReceiver, endpoint)
}

for (const endpoint of centralRequiredReadParams) {
  assertEndpoint('central-api', centralApi, endpoint)
}

for (const endpoint of receiverSupportedReadParams) {
  assertEndpoint('local-receiver', localReceiver, endpoint)
}

for (const endpoint of centralOnlyBatchEndpoints) {
  assertEndpoint('central-api', centralApi, endpoint)
}

console.log('Market API contracts are compatible.')
