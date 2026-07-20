import type { CalculationSummarySnapshot } from './calculationSummary'

const COMPRESSED_PREFIX = 'z.'
const JSON_PREFIX = 'j.'

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function compress(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  const stream = new Blob([Uint8Array.from(bytes).buffer])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('El navegador no puede abrir este cálculo comprimido.')
  }
  const stream = new Blob([Uint8Array.from(bytes).buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isCalculationSummarySnapshot(
  value: unknown,
): value is CalculationSummarySnapshot {
  if (!isRecord(value)) return false
  return (
    typeof value['generatedAt'] === 'string' &&
    typeof value['itemName'] === 'string' &&
    typeof value['cityName'] === 'string' &&
    typeof value['stationName'] === 'string' &&
    typeof value['quantity'] === 'number' &&
    typeof value['totalCost'] === 'number' &&
    typeof value['silverSaved'] === 'number' &&
    typeof value['returnRate'] === 'number' &&
    typeof value['isComplete'] === 'boolean' &&
    typeof value['isPremium'] === 'boolean' &&
    Array.isArray(value['missingPrices']) &&
    Array.isArray(value['returnedMaterials'])
  )
}

export async function encodeSharedCalculation(
  summary: CalculationSummarySnapshot,
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(summary))
  const compressed = await compress(bytes)
  return compressed && compressed.length < bytes.length
    ? `${COMPRESSED_PREFIX}${toBase64Url(compressed)}`
    : `${JSON_PREFIX}${toBase64Url(bytes)}`
}

export async function decodeSharedCalculation(
  token: string,
): Promise<CalculationSummarySnapshot> {
  const prefix = token.slice(0, 2)
  const encoded = token.slice(2)
  if (!encoded || (prefix !== COMPRESSED_PREFIX && prefix !== JSON_PREFIX)) {
    throw new Error('El enlace compartido no tiene un formato compatible.')
  }

  const encodedBytes = fromBase64Url(encoded)
  const bytes =
    prefix === COMPRESSED_PREFIX ? await decompress(encodedBytes) : encodedBytes
  const summary: unknown = JSON.parse(new TextDecoder().decode(bytes))
  if (!isCalculationSummarySnapshot(summary)) {
    throw new Error('El cálculo compartido está incompleto o dañado.')
  }
  return summary
}

export async function createSharedCalculationUrl(
  summary: CalculationSummarySnapshot,
): Promise<string> {
  const url = new URL(window.location.origin)
  url.searchParams.set('c', await encodeSharedCalculation(summary))
  return url.toString()
}
