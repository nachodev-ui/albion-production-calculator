from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.strip() + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {path}")


def update_package_json() -> None:
    path = ROOT / "package.json"
    pkg = json.loads(path.read_text(encoding="utf-8"))
    scripts = dict(pkg.get("scripts", {}))
    scripts["security:check"] = "tsx scripts/check-public-security.ts"
    pkg["scripts"] = scripts
    path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print("updated package.json")


def update_ci() -> None:
    path = ROOT / ".github/workflows/ci.yml"
    text = path.read_text(encoding="utf-8")

    if "pnpm contracts:check" not in text:
        marker = "      - name: Run lint\n        run: pnpm lint\n"
        if marker not in text:
            raise RuntimeError("No encontré el bloque 'Run lint' en .github/workflows/ci.yml")
        text = text.replace(
            marker,
            "      - name: Validate API contracts\n        run: pnpm contracts:check\n\n" + marker,
            1,
        )

    if "pnpm security:check" not in text:
        marker = "      - name: Run lint\n        run: pnpm lint\n"
        if marker not in text:
            raise RuntimeError("No encontré el bloque 'Run lint' en .github/workflows/ci.yml")
        text = text.replace(
            marker,
            "      - name: Validate public security config\n        run: pnpm security:check\n\n" + marker,
            1,
        )

    path.write_text(text, encoding="utf-8", newline="\n")
    print("updated .github/workflows/ci.yml")


PUBLIC_ENV_TS = r'''
const DEFAULT_CENTRAL_MARKET_API_URL = 'http://127.0.0.1:8080/api/v1'
const DEFAULT_LOCAL_MARKET_API_URL = 'http://127.0.0.1:8787/api/v1'
const DEFAULT_MARKET_REQUEST_TIMEOUT_MS = 7_000

const MIN_TIMEOUT_MS = 1_000
const MAX_TIMEOUT_MS = 30_000

const ALLOWED_PUBLIC_ENV_KEYS = new Set([
  'VITE_CENTRAL_MARKET_API_URL',
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
}: {
  readonly key: string
  readonly rawValue: string | undefined
  readonly fallback: string
}): string {
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

  if (parsed.protocol === 'http:' && !isLoopbackHostname(parsed.hostname)) {
    throw new Error(`${key} solo puede usar http en localhost/127.0.0.1`)
  }

  const normalized = parsed.toString().replace(/\/$/, '')
  if (!normalized.endsWith('/api/v1')) {
    throw new Error(`${key} debe apuntar a una base URL terminada en /api/v1`)
  }

  return normalized
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

export const PUBLIC_ENV = {
  centralMarketApiUrl: normalizeApiBaseUrl({
    key: 'VITE_CENTRAL_MARKET_API_URL',
    rawValue: readPublicEnv('VITE_CENTRAL_MARKET_API_URL'),
    fallback: DEFAULT_CENTRAL_MARKET_API_URL,
  }),
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
'''

FETCH_JSON_TS = r'''
export interface FetchJsonOptions extends RequestInit {
  readonly timeoutMs: number
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  window.setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

function combineSignals(
  signal: AbortSignal | null | undefined,
  timeoutSignal: AbortSignal,
): AbortSignal {
  if (!signal) return timeoutSignal

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signal, timeoutSignal])
  }

  const controller = new AbortController()

  const abort = () => {
    if (!controller.signal.aborted) controller.abort()
  }

  if (signal.aborted || timeoutSignal.aborted) {
    abort()
    return controller.signal
  }

  signal.addEventListener('abort', abort, { once: true })
  timeoutSignal.addEventListener('abort', abort, { once: true })

  return controller.signal
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  { timeoutMs, signal, ...init }: FetchJsonOptions,
): Promise<T> {
  const timeoutSignal = createTimeoutSignal(timeoutMs)
  const response = await fetch(input, {
    ...init,
    signal: combineSignals(signal, timeoutSignal),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}
'''

LOCAL_MARKET_API_TS = r'''
import { PUBLIC_ENV } from '@shared/config/publicEnv'
import type { AlbionServer } from '../types/MarketPrice'

/**
 * API central de lectura.
 * No debe contener credenciales: toda variable VITE_* queda expuesta al bundle.
 */
export const CENTRAL_MARKET_API_URL = PUBLIC_ENV.centralMarketApiUrl

/**
 * Receiver local.
 * Se conserva VITE_MARKET_API_URL como alias legado, validado desde publicEnv.
 */
export const LOCAL_MARKET_API_URL = PUBLIC_ENV.localMarketApiUrl

export const MARKET_REQUEST_TIMEOUT_MS = PUBLIC_ENV.marketRequestTimeoutMs

export const MARKET_SERVER_IDS: Record<AlbionServer, string> = {
  americas: 'west',
  asia: 'east',
  europe: 'europe',
}

/** @deprecated Use MARKET_SERVER_IDS. */
export const LOCAL_SERVER_IDS = MARKET_SERVER_IDS
'''

CENTRAL_MARKET_CLIENT_TS = r'''
import { fetchJson } from '@shared/http/fetchJson'
import type {
  AlbionServer,
  MarketCityId,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'
import {
  CENTRAL_MARKET_API_URL,
  MARKET_REQUEST_TIMEOUT_MS,
  MARKET_SERVER_IDS,
} from './localMarketApi'
import { mapMarketPriceRow, parsePriceRows } from './marketResponseMapping'

interface FetchCurrentCentralPricesParams {
  readonly server: AlbionServer
  readonly itemIdentifiers: readonly string[]
  readonly cities: readonly MarketCityId[]
  readonly quality: number
  readonly signal?: AbortSignal
}

export async function fetchCurrentCentralPrices({
  server,
  itemIdentifiers,
  cities,
  quality,
  signal,
}: FetchCurrentCentralPricesParams): Promise<
  ReadonlyMap<string, MarketPriceSnapshot>
> {
  const uniqueItems = Array.from(new Set(itemIdentifiers)).filter(Boolean)
  const uniqueCities = Array.from(new Set(cities)).filter(Boolean)

  if (uniqueItems.length === 0 || uniqueCities.length === 0) {
    return new Map()
  }

  const payload = await fetchJson<unknown>(
    `${CENTRAL_MARKET_API_URL}/prices/query`,
    {
      method: 'POST',
      signal,
      timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server: MARKET_SERVER_IDS[server],
        marketKeys: uniqueCities,
        entries: uniqueItems.map((itemIdentifier) => ({
          itemIdentifier,
          quality,
        })),
      }),
    },
  )

  const rows = parsePriceRows(payload)
  const fetchedAt = new Date().toISOString()
  const result = new Map<string, MarketPriceSnapshot>()

  for (const row of rows) {
    const snapshot = mapMarketPriceRow({
      server,
      fallbackQuality: quality,
      row,
      source: 'central-api',
      fetchedAt,
    })

    if (!snapshot || !uniqueCities.includes(snapshot.city)) continue

    result.set(
      buildMarketCacheKey(
        snapshot.server,
        snapshot.city,
        snapshot.itemIdentifier,
        snapshot.quality,
      ),
      snapshot,
    )
  }

  return result
}
'''

LOCAL_MARKET_CLIENT_TS = r'''
import { fetchJson } from '@shared/http/fetchJson'
import type {
  AlbionServer,
  MarketCityId,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'
import {
  LOCAL_MARKET_API_URL,
  MARKET_REQUEST_TIMEOUT_MS,
  MARKET_SERVER_IDS,
} from './localMarketApi'
import { mapMarketPriceRow, parsePriceRows } from './marketResponseMapping'

const MAX_URL_LENGTH = 3900

interface FetchCurrentLocalPricesParams {
  readonly server: AlbionServer
  readonly itemIdentifiers: readonly string[]
  readonly cities: readonly MarketCityId[]
  readonly quality: number
  readonly signal?: AbortSignal
}

function createRequestUrl(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  city: MarketCityId,
  quality: number,
): string {
  const params = new URLSearchParams({
    server: MARKET_SERVER_IDS[server],
    itemIds: itemIdentifiers.join(','),
    marketKey: city,
    quality: String(quality),
  })

  return `${LOCAL_MARKET_API_URL}/prices?${params.toString()}`
}

function splitIntoUrlSafeBatches(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  city: MarketCityId,
  quality: number,
): readonly (readonly string[])[] {
  const batches: string[][] = []
  let current: string[] = []

  for (const identifier of itemIdentifiers) {
    const candidate = [...current, identifier]
    const candidateUrl = createRequestUrl(server, candidate, city, quality)

    if (candidateUrl.length > MAX_URL_LENGTH && current.length > 0) {
      batches.push(current)
      current = [identifier]
    } else {
      current = candidate
    }
  }

  if (current.length > 0) batches.push(current)

  return batches
}

async function fetchBatch(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  city: MarketCityId,
  quality: number,
  fetchedAt: string,
  signal?: AbortSignal,
): Promise<readonly MarketPriceSnapshot[]> {
  const payload = await fetchJson<unknown>(
    createRequestUrl(server, itemIdentifiers, city, quality),
    {
      signal,
      timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
      },
    },
  )

  return parsePriceRows(payload).flatMap((row) => {
    const snapshot = mapMarketPriceRow({
      server,
      fallbackCity: city,
      fallbackQuality: quality,
      row,
      source: 'local-receiver',
      fetchedAt,
    })

    return snapshot ? [snapshot] : []
  })
}

export async function fetchCurrentLocalPrices({
  server,
  itemIdentifiers,
  cities,
  quality,
  signal,
}: FetchCurrentLocalPricesParams): Promise<
  ReadonlyMap<string, MarketPriceSnapshot>
> {
  const uniqueItems = Array.from(new Set(itemIdentifiers)).filter(Boolean)
  const uniqueCities = Array.from(new Set(cities)).filter(Boolean)

  if (uniqueItems.length === 0 || uniqueCities.length === 0) {
    return new Map()
  }

  const fetchedAt = new Date().toISOString()
  const result = new Map<string, MarketPriceSnapshot>()

  for (const city of uniqueCities) {
    const batches = splitIntoUrlSafeBatches(server, uniqueItems, city, quality)

    for (const batch of batches) {
      const snapshots = await fetchBatch(
        server,
        batch,
        city,
        quality,
        fetchedAt,
        signal,
      )

      for (const snapshot of snapshots) {
        result.set(
          buildMarketCacheKey(
            snapshot.server,
            snapshot.city,
            snapshot.itemIdentifier,
            snapshot.quality,
          ),
          snapshot,
        )
      }
    }
  }

  return result
}
'''

CENTRAL_HISTORY_CLIENT_TS = r'''
import type {
  CentralHistoryEnvelope,
  CentralHistorySeriesPayload,
} from '@shared/contracts/market-api-payloads'
import { fetchJson } from '@shared/http/fetchJson'
import type {
  MarketHistoryCandidate,
  MarketHistorySnapshot,
} from '../types/MarketHistory'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type { AlbionServer } from '../types/MarketPrice'
import {
  CENTRAL_MARKET_API_URL,
  MARKET_REQUEST_TIMEOUT_MS,
  MARKET_SERVER_IDS,
} from './localMarketApi'
import {
  mapHistoryPoints,
  normalizeHistoryTimestamp,
} from './marketHistoryResponseMapping'

interface FetchCentralHistoryParams {
  readonly server: AlbionServer
  readonly candidates: readonly MarketHistoryCandidate[]
  readonly rangeStart: string
  readonly rangeEnd: string
  readonly signal?: AbortSignal
}

function normalizeQuality(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

export async function fetchCentralMarketHistory({
  server,
  candidates,
  rangeStart,
  rangeEnd,
  signal,
}: FetchCentralHistoryParams): Promise<
  ReadonlyMap<string, MarketHistorySnapshot>
> {
  const requested = new Map<string, MarketHistoryCandidate>()

  for (const candidate of candidates) {
    if (candidate.server !== server) continue

    requested.set(
      buildMarketHistoryCacheKey(
        candidate.server,
        candidate.city,
        candidate.itemIdentifier,
        candidate.quality,
      ),
      candidate,
    )
  }

  if (requested.size === 0) return new Map()

  const marketKeys = Array.from(
    new Set(Array.from(requested.values(), (candidate) => candidate.city)),
  )

  const entryKeys = new Set<string>()
  const entries: { readonly itemIdentifier: string; readonly quality: number }[] = []

  for (const candidate of requested.values()) {
    const entryKey = `${candidate.itemIdentifier}|${candidate.quality}`
    if (entryKeys.has(entryKey)) continue

    entryKeys.add(entryKey)
    entries.push({
      itemIdentifier: candidate.itemIdentifier,
      quality: candidate.quality,
    })
  }

  const envelope = await fetchJson<CentralHistoryEnvelope>(
    `${CENTRAL_MARKET_API_URL}/history/query`,
    {
      method: 'POST',
      signal,
      timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server: MARKET_SERVER_IDS[server],
        marketKeys,
        entries,
        rangeStart,
        rangeEnd,
      }),
    },
  )

  const rows = Array.isArray(envelope.data) ? envelope.data : []
  const requestedAt =
    normalizeHistoryTimestamp(envelope.requestedAt) ?? new Date().toISOString()
  const result = new Map<string, MarketHistorySnapshot>()

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue

    const candidate = row as CentralHistorySeriesPayload

    if (
      typeof candidate.marketKey !== 'string' ||
      typeof candidate.itemIdentifier !== 'string'
    ) {
      continue
    }

    const quality = normalizeQuality(candidate.quality)
    if (quality === null) continue

    const cacheKey = buildMarketHistoryCacheKey(
      server,
      candidate.marketKey,
      candidate.itemIdentifier,
      quality,
    )

    if (!requested.has(cacheKey)) continue

    result.set(cacheKey, {
      server,
      city: candidate.marketKey,
      itemIdentifier: candidate.itemIdentifier,
      quality,
      rangeStart,
      rangeEnd,
      points: mapHistoryPoints(candidate.history),
      source: 'central-api',
      fetchedAt: requestedAt,
    })
  }

  return result
}
'''

LOCAL_HISTORY_CLIENT_TS = r'''
import type {
  LocalHistoryEnvelope,
  LocalHistoryRecord,
} from '@shared/contracts/market-api-payloads'
import { fetchJson } from '@shared/http/fetchJson'
import type { MarketHistorySnapshot } from '../types/MarketHistory'
import type {
  AlbionServer,
  MarketCityId,
} from '../types/MarketPrice'
import {
  LOCAL_MARKET_API_URL,
  LOCAL_SERVER_IDS,
  MARKET_REQUEST_TIMEOUT_MS,
} from './localMarketApi'
import { mapHistoryPoints } from './marketHistoryResponseMapping'

interface FetchLocalMarketHistoryParams {
  readonly server: AlbionServer
  readonly itemIdentifier: string
  readonly city: MarketCityId
  readonly quality: number
  readonly rangeStart: string
  readonly rangeEnd: string
  readonly signal?: AbortSignal
}

function createHistoryRequestUrl({
  server,
  itemIdentifier,
  city,
  quality,
}: Omit<FetchLocalMarketHistoryParams, 'rangeStart' | 'rangeEnd' | 'signal'>): string {
  const params = new URLSearchParams({
    server: LOCAL_SERVER_IDS[server],
    itemId: itemIdentifier,
    marketKey: city,
    quality: String(quality),
    period: '4-weeks',
    limit: '1',
  })

  return `${LOCAL_MARKET_API_URL}/history?${params.toString()}`
}

export async function fetchLocalMarketHistory({
  server,
  itemIdentifier,
  city,
  quality,
  rangeStart,
  rangeEnd,
  signal,
}: FetchLocalMarketHistoryParams): Promise<MarketHistorySnapshot> {
  const payload = await fetchJson<LocalHistoryEnvelope>(
    createHistoryRequestUrl({
      server,
      itemIdentifier,
      city,
      quality,
    }),
    {
      signal,
      timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const data = payload.data
  const firstRecord = Array.isArray(data) && data.length > 0 ? data[0] : undefined
  const history =
    firstRecord && typeof firstRecord === 'object'
      ? (firstRecord as LocalHistoryRecord).history
      : undefined

  return {
    server,
    itemIdentifier,
    city,
    quality,
    rangeStart,
    rangeEnd,
    points: mapHistoryPoints(history),
    source: 'local-receiver',
    fetchedAt: new Date().toISOString(),
  }
}
'''

CENTRAL_MARKET_CATALOG_CLIENT_TS = r'''
import type { CentralMarketCatalogEnvelope } from '@shared/contracts/market-api-payloads'
import { fetchJson } from '@shared/http/fetchJson'
import type { MarketDefinition, MarketType } from '../types/MarketPrice'
import {
  CENTRAL_MARKET_API_URL,
  MARKET_REQUEST_TIMEOUT_MS,
} from './localMarketApi'

function isMarketType(value: unknown): value is MarketType {
  return value === 'regular' || value === 'black-market'
}

function mapMarket(value: unknown): MarketDefinition | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate['key'] !== 'string' ||
    candidate['key'].trim().length === 0 ||
    typeof candidate['name'] !== 'string' ||
    candidate['name'].trim().length === 0 ||
    !isMarketType(candidate['type']) ||
    typeof candidate['enabled'] !== 'boolean'
  ) {
    return null
  }

  return {
    key: candidate['key'].trim(),
    name: candidate['name'].trim(),
    type: candidate['type'],
    enabled: candidate['enabled'],
  }
}

export async function fetchCentralMarkets(
  signal?: AbortSignal,
): Promise<readonly MarketDefinition[]> {
  const payload = await fetchJson<CentralMarketCatalogEnvelope>(
    `${CENTRAL_MARKET_API_URL}/markets`,
    {
      signal,
      timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
      headers: { Accept: 'application/json' },
    },
  )

  const data = payload.data

  if (!Array.isArray(data)) {
    throw new Error('La API central no devolvió la lista de mercados')
  }

  const markets = data.flatMap((entry) => {
    const market = mapMarket(entry)
    return market?.enabled ? [market] : []
  })

  if (markets.length === 0) {
    throw new Error('La API central no tiene mercados habilitados')
  }

  return markets
}
'''

LOCAL_MARKET_CATALOG_CLIENT_TS = r'''
import type { LocalMarketCatalogEnvelope } from '@shared/contracts/market-api-payloads'
import { fetchJson } from '@shared/http/fetchJson'
import type { MarketDefinition, MarketType } from '../types/MarketPrice'
import {
  LOCAL_MARKET_API_URL,
  MARKET_REQUEST_TIMEOUT_MS,
} from './localMarketApi'

function isMarketType(value: unknown): value is MarketType {
  return value === 'regular' || value === 'black-market'
}

function mapMarket(value: unknown): MarketDefinition | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate['key'] !== 'string' ||
    candidate['key'].trim().length === 0 ||
    typeof candidate['name'] !== 'string' ||
    candidate['name'].trim().length === 0 ||
    !isMarketType(candidate['type']) ||
    typeof candidate['enabled'] !== 'boolean'
  ) {
    return null
  }

  return {
    key: candidate['key'].trim(),
    name: candidate['name'].trim(),
    type: candidate['type'],
    enabled: candidate['enabled'],
  }
}

export async function fetchLocalMarkets(
  signal?: AbortSignal,
): Promise<readonly MarketDefinition[]> {
  const payload = await fetchJson<LocalMarketCatalogEnvelope>(
    `${LOCAL_MARKET_API_URL}/markets`,
    {
      signal,
      timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
      headers: { Accept: 'application/json' },
    },
  )

  const data = payload.data

  if (!Array.isArray(data)) {
    throw new Error('El receiver local no devolvió la lista de mercados')
  }

  const markets = data.flatMap((entry) => {
    const market = mapMarket(entry)
    return market?.enabled ? [market] : []
  })

  if (markets.length === 0) {
    throw new Error('El receiver local no tiene mercados habilitados')
  }

  return markets
}
'''

HEADERS = r'''
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https: http://127.0.0.1:8080 http://localhost:8080 http://127.0.0.1:8787 http://localhost:8787; worker-src 'self' blob:; manifest-src 'self';
'''

ENV_EXAMPLE = r'''
# API central de lectura.
# En producción debe usar HTTPS si apunta a un host remoto.
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1

# Receiver local.
# Puede usar HTTP solo en localhost/127.0.0.1.
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1

# Alias legado para instalaciones antiguas.
# Preferir VITE_LOCAL_MARKET_API_URL en configuraciones nuevas.
# VITE_MARKET_API_URL=http://127.0.0.1:8787/api/v1

# Timeout de requests de mercado.
# Rango permitido: 1000-30000.
VITE_MARKET_REQUEST_TIMEOUT_MS=7000

# Nunca agregar secretos, tokens ni credenciales con prefijo VITE_.
'''

CHECK_PUBLIC_SECURITY_TS = r'''
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'

const allowedViteKeys = new Set([
  'VITE_CENTRAL_MARKET_API_URL',
  'VITE_LOCAL_MARKET_API_URL',
  'VITE_MARKET_API_URL',
  'VITE_MARKET_REQUEST_TIMEOUT_MS',
])

const sensitiveKeyPattern =
  /VITE_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PASS|PRIVATE|API_KEY|AUTH|BEARER|JWT|CREDENTIAL)[A-Z0-9_]*/g

function gitLsFiles(): readonly string[] {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' },
  )
    .split(/\r?\n/)
    .filter(Boolean)
}

function assertNoTrackedEnvFiles(files: readonly string[]): void {
  const forbidden = files.filter((file) => {
    const name = file.split(/[\\/]/).at(-1) ?? file
    return (
      name.startsWith('.env') &&
      name !== '.env.example' &&
      !name.endsWith('.example')
    )
  })

  if (forbidden.length > 0) {
    throw new Error(
      `No se deben trackear archivos .env reales:\n${forbidden.join('\n')}`,
    )
  }
}

function assertViteEnvKeysAreAllowed(files: readonly string[]): void {
  const violations: string[] = []

  for (const file of files) {
    if (
      !file.endsWith('.ts') &&
      !file.endsWith('.tsx') &&
      !file.endsWith('.js') &&
      !file.endsWith('.jsx') &&
      !file.endsWith('.md') &&
      !file.endsWith('.example')
    ) {
      continue
    }

    const text = readFileSync(file, 'utf8')

    for (const match of text.matchAll(/\bVITE_[A-Z0-9_]+\b/g)) {
      const key = match[0]
      if (!allowedViteKeys.has(key)) {
        violations.push(`${file}: variable VITE_* no permitida: ${key}`)
      }
    }

    for (const match of text.matchAll(sensitiveKeyPattern)) {
      violations.push(`${file}: posible credencial pública: ${match[0]}`)
    }
  }

  if (violations.length > 0) {
    throw new Error(violations.join('\n'))
  }
}

function assertSecurityHeaders(): void {
  const headersPath = 'public/_headers'
  if (!existsSync(headersPath)) {
    throw new Error('Falta public/_headers')
  }

  const headers = readFileSync(headersPath, 'utf8')
  const required = [
    'Content-Security-Policy:',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
    'Referrer-Policy: no-referrer',
    'Permissions-Policy:',
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self'",
  ]

  const missing = required.filter((entry) => !headers.includes(entry))
  if (missing.length > 0) {
    throw new Error(
      `Headers de seguridad incompletos en ${relative(process.cwd(), headersPath)}:\n${missing.join('\n')}`,
    )
  }
}

const files = gitLsFiles()

assertNoTrackedEnvFiles(files)
assertViteEnvKeysAreAllowed(files)
assertSecurityHeaders()

console.log('Public frontend security configuration is valid.')
'''

README = r'''
# Paso 2 - Security/config hardening patch

Ejecutar desde la raíz del repositorio `albion-craft-calculator`:

```bash
python apply-step2-security-hardening.py
rm -rf docs/.vitepress/cache docs/.vitepress/dist dist
npx -y pnpm@10.23.0 security:check
npx -y pnpm@10.23.0 contracts:check
npx -y pnpm@10.23.0 test
npx -y pnpm@10.23.0 lint
npx -y pnpm@10.23.0 build
npx -y pnpm@10.23.0 docs:build
git status --short
```

Luego commit sugerido:

```bash
git add .
git commit -m "feat: harden public config and market requests"
git push -u origin feat/security-config-hardening
```

El parche sobrescribe los archivos de seguridad/configuración y los clientes HTTP de mercado para corregir las ediciones truncadas de consola.
'''


def main() -> None:
    required = ["package.json", "src/features/market-data/api"]
    missing = [path for path in required if not (ROOT / path).exists()]
    if missing:
        raise SystemExit(
            "Ejecuta este script desde la raíz del repo albion-craft-calculator. "
            f"Faltan: {', '.join(missing)}"
        )

    write("src/shared/config/publicEnv.ts", PUBLIC_ENV_TS)
    write("src/shared/http/fetchJson.ts", FETCH_JSON_TS)
    write("src/features/market-data/api/localMarketApi.ts", LOCAL_MARKET_API_TS)
    write("src/features/market-data/api/centralMarketClient.ts", CENTRAL_MARKET_CLIENT_TS)
    write("src/features/market-data/api/localMarketClient.ts", LOCAL_MARKET_CLIENT_TS)
    write("src/features/market-data/api/centralHistoryClient.ts", CENTRAL_HISTORY_CLIENT_TS)
    write("src/features/market-data/api/localHistoryClient.ts", LOCAL_HISTORY_CLIENT_TS)
    write("src/features/market-data/api/centralMarketCatalogClient.ts", CENTRAL_MARKET_CATALOG_CLIENT_TS)
    write("src/features/market-data/api/localMarketCatalogClient.ts", LOCAL_MARKET_CATALOG_CLIENT_TS)
    write("public/_headers", HEADERS)
    write(".env.example", ENV_EXAMPLE)
    write("scripts/check-public-security.ts", CHECK_PUBLIC_SECURITY_TS)
    update_package_json()
    update_ci()
    print("\nPatch aplicado. Ejecuta ahora las validaciones del README.")


if __name__ == "__main__":
    main()
