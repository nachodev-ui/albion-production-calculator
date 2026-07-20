import type { CalculationSummarySnapshot } from './calculationSummary'

const SHARE_VERSION = 1
const COMPRESSED_PREFIX = 'z.'
const JSON_PREFIX = 'j.'

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function compress(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  const stream = new Blob([bytes]).stream().pipeThrough(
    new CompressionStream('deflate-raw'),
  )
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('El navegador no puede descomprimir este cálculo compartido.')
  }
  const stream = new Blob([bytes]).stream().pipeThrough(
    new DecompressionStream('deflate-raw'),
  )
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isCalculationSummarySnapshot(
  value: unknown,
): value is CalculationSummarySnapshot {
  if (!isRecord(value)) return false

  return (
    typeof value['generatedAt'] === 'string' &&
    typeof value['itemName'] === 'string' &&
    isFiniteNumber(value['tier']) &&
    isFiniteNumber(value['enchantment']) &&
    isFiniteNumber(value['quantity']) &&
    typeof value['cityName'] === 'string' &&
    typeof value['hasSpecialtyBonus'] === 'boolean' &&
    typeof value['useFocus'] === 'boolean' &&
    typeof value['hasDailyBonus'] === 'boolean' &&
    isFiniteNumber(value['dailyBonusAmount']) &&
    isFiniteNumber(value['returnRate']) &&
    typeof value['stationName'] === 'string' &&
    typeof value['stationAccessLabel'] === 'string' &&
    isFiniteNumber(value['stationUsageFee']) &&
    isFiniteNumber(value['totalCost']) &&
    isFiniteNumber(value['silverSaved']) &&
    isFiniteNumber(value['stationFees']) &&
    typeof value['isComplete'] === 'boolean' &&
    Array.isArray(value['missingPrices']) &&
    Array.isArray(value['returnedMaterials']) &&
    typeof value['isPremium'] === 'boolean' &&
    (value['unitSellPrice'] === null || isFiniteNumber(value['unitSellPrice']))
  )
}

export async function encodeSharedCalculation(
  summary: CalculationSummarySnapshot,
): Promise<string> {
  const json = JSON.stringify({ v: SHARE_VERSION, s: summary })
  const bytes = new TextEncoder().encode(json)
  const compressed = await compress(bytes)

  if (compressed && compressed.length < bytes.length) {
    return `${COMPRESSED_PREFIX}${bytesToBase64Url(compressed)}`
  }
  return `${JSON_PREFIX}${bytesToBase64Url(bytes)}`
}

export async function decodeSharedCalculation(
  token: string,
): Promise<CalculationSummarySnapshot> {
  const prefix = token.slice(0, 2)
  const encoded = token.slice(2)
  if (!encoded || (prefix !== COMPRESSED_PREFIX && prefix !== JSON_PREFIX)) {
    throw new Error('El enlace compartido no tiene un formato compatible.')
  }

  const encodedBytes = base64UrlToBytes(encoded)
  const bytes =
    prefix === COMPRESSED_PREFIX ? await decompress(encodedBytes) : encodedBytes
  const payload: unknown = JSON.parse(new TextDecoder().decode(bytes))

  if (
    !isRecord(payload) ||
    payload['v'] !== SHARE_VERSION ||
    !isCalculationSummarySnapshot(payload['s'])
  ) {
    throw new Error('El cálculo compartido está incompleto o dañado.')
  }
  return payload['s']
}

export async function createSharedCalculationUrl(
  summary: CalculationSummarySnapshot,
): Promise<string> {
  const url = new URL(window.location.origin)
  url.searchParams.set('c', await encodeSharedCalculation(summary))
  return url.toString()
}
