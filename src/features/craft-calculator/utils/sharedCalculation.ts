import type { CalculationSummarySnapshot } from './calculationSummary'

function encode(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function decode(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  return decodeURIComponent(escape(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))))
}

export function isCalculationSummarySnapshot(
  value: unknown,
): value is CalculationSummarySnapshot {
  const summary = value as Partial<CalculationSummarySnapshot> | null
  return Boolean(
    summary &&
      typeof summary.itemName === 'string' &&
      typeof summary.generatedAt === 'string' &&
      typeof summary.totalCost === 'number' &&
      Array.isArray(summary.returnedMaterials),
  )
}

export async function encodeSharedCalculation(
  summary: CalculationSummarySnapshot,
): Promise<string> {
  return encode(JSON.stringify(summary))
}

export async function decodeSharedCalculation(
  token: string,
): Promise<CalculationSummarySnapshot> {
  const summary: unknown = JSON.parse(decode(token))
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
