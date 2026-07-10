import { FetchJsonError } from '@shared/http/fetchJson'
import type { MarketDataSource } from '../types/MarketPrice'
import { LOCAL_RECEIVER_FALLBACK_ENABLED } from './localMarketApi'

export type MarketNetworkSource = Extract<
  MarketDataSource,
  'central-api' | 'local-receiver'
>

export type MarketSourceRuntimeState = 'ready' | 'cooldown'

export interface MarketSourceCooldownSnapshot {
  readonly source: MarketNetworkSource
  readonly failureCount: number
  readonly blockedUntil: number
  readonly remainingMs: number
  readonly reason: string
}

export interface MarketSourceRuntimeStatus {
  readonly source: MarketNetworkSource
  readonly state: MarketSourceRuntimeState
  readonly cooldown: MarketSourceCooldownSnapshot | null
}

interface MarketSourceCooldownState {
  readonly failureCount: number
  readonly blockedUntil: number
  readonly lastFailureAt: number
  readonly reason: string
}

const BASE_SOURCE_COOLDOWN_MS = 30_000
const MAX_SOURCE_COOLDOWN_MS = 2 * 60 * 1000

const sourceCooldowns = new Map<
  MarketNetworkSource,
  MarketSourceCooldownState
>()

let forceEnabledForTests = false

export class MarketSourceCooldownError extends Error {
  readonly source: MarketNetworkSource
  readonly blockedUntil: number
  readonly remainingMs: number
  readonly reason: string

  constructor(snapshot: MarketSourceCooldownSnapshot) {
    super(
      `${snapshot.source} en cooldown por ${Math.ceil(
        snapshot.remainingMs / 1000,
      )}s`,
    )
    this.name = 'MarketSourceCooldownError'
    this.source = snapshot.source
    this.blockedUntil = snapshot.blockedUntil
    this.remainingMs = snapshot.remainingMs
    this.reason = snapshot.reason
  }
}

function isCooldownRuntimeEnabled(): boolean {
  return import.meta.env.MODE !== 'test' || forceEnabledForTests
}

function calculateCooldownMs(failureCount: number): number {
  return Math.min(
    BASE_SOURCE_COOLDOWN_MS * 2 ** Math.max(0, failureCount - 1),
    MAX_SOURCE_COOLDOWN_MS,
  )
}

function shouldCooldownFailure(error: unknown): boolean {
  if (error instanceof MarketSourceCooldownError) return false

  if (error instanceof FetchJsonError) {
    return error.category !== 'abort' && error.retriable
  }

  return true
}

function describeFailure(error: unknown): string {
  if (error instanceof FetchJsonError) {
    return error.status
      ? `${error.category}:${error.status}`
      : error.category
  }

  if (error instanceof Error && error.name) return error.name

  return 'unknown'
}

export function getMarketSourceCooldown(
  source: MarketNetworkSource,
  now = Date.now(),
): MarketSourceCooldownSnapshot | null {
  const state = sourceCooldowns.get(source)
  if (!state) return null

  const remainingMs = state.blockedUntil - now
  if (remainingMs <= 0) {
    sourceCooldowns.delete(source)
    return null
  }

  return {
    source,
    failureCount: state.failureCount,
    blockedUntil: state.blockedUntil,
    remainingMs,
    reason: state.reason,
  }
}

export function getMarketSourceStatuses(
  now = Date.now(),
  localReceiverFallbackEnabled = LOCAL_RECEIVER_FALLBACK_ENABLED,
): readonly MarketSourceRuntimeStatus[] {
  const sources: readonly MarketNetworkSource[] =
    localReceiverFallbackEnabled
      ? ['central-api', 'local-receiver']
      : ['central-api']

  return sources.map((source) => {
    const cooldown = getMarketSourceCooldown(source, now)

    return {
      source,
      state: cooldown ? 'cooldown' : 'ready',
      cooldown,
    }
  })
}

export function isMarketSourceInCooldown(
  source: MarketNetworkSource,
  now = Date.now(),
): boolean {
  return getMarketSourceCooldown(source, now) !== null
}

export function recordMarketSourceSuccess(source: MarketNetworkSource): void {
  sourceCooldowns.delete(source)
}

export function recordMarketSourceFailure(
  source: MarketNetworkSource,
  error: unknown,
  now = Date.now(),
): void {
  if (!shouldCooldownFailure(error)) return

  const previous = sourceCooldowns.get(source)
  const failureCount = (previous?.failureCount ?? 0) + 1
  const cooldownMs = calculateCooldownMs(failureCount)

  sourceCooldowns.set(source, {
    failureCount,
    blockedUntil: now + cooldownMs,
    lastFailureAt: now,
    reason: describeFailure(error),
  })
}

export async function runWithMarketSourceCooldown<T>(
  source: MarketNetworkSource,
  operation: () => Promise<T>,
  now: () => number = Date.now,
): Promise<T> {
  if (!isCooldownRuntimeEnabled()) {
    return operation()
  }

  const cooldown = getMarketSourceCooldown(source, now())
  if (cooldown) throw new MarketSourceCooldownError(cooldown)

  try {
    const result = await operation()
    recordMarketSourceSuccess(source)
    return result
  } catch (error) {
    recordMarketSourceFailure(source, error, now())
    throw error
  }
}

export function enableMarketSourceCooldownForTests(): void {
  forceEnabledForTests = true
}

export function resetMarketSourceCooldownForTests(): void {
  sourceCooldowns.clear()
  forceEnabledForTests = false
}
