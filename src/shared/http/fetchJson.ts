export type FetchJsonErrorCategory =
  | 'abort'
  | 'timeout'
  | 'network'
  | 'http'
  | 'invalid-json'

export interface FetchJsonOptions extends RequestInit {
  readonly timeoutMs: number
  readonly retryAttempts?: number
  readonly retryDelayMs?: number
}

interface TimeoutSignalHandle {
  readonly signal: AbortSignal
  readonly clear: () => void
}

interface FetchJsonErrorOptions {
  readonly category: FetchJsonErrorCategory
  readonly status?: number
  readonly retriable: boolean
  readonly cause?: unknown
}

const DEFAULT_RETRY_ATTEMPTS = 2
const DEFAULT_RETRY_DELAY_MS = 150
const MAX_RETRY_ATTEMPTS = 3

const RETRIABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

export class FetchJsonError extends Error {
  readonly category: FetchJsonErrorCategory
  readonly status?: number
  readonly retriable: boolean

  constructor(message: string, options: FetchJsonErrorOptions) {
    super(message)
    this.name = 'FetchJsonError'
    this.category = options.category
    this.status = options.status
    this.retriable = options.retriable
    this.cause = options.cause
  }
}

function normalizeRetryAttempts(value: number | undefined): number {
  if (value === undefined) return DEFAULT_RETRY_ATTEMPTS
  if (!Number.isInteger(value) || value < 0) return 0
  return Math.min(value, MAX_RETRY_ATTEMPTS)
}

function normalizeRetryDelayMs(value: number | undefined): number {
  if (value === undefined) return DEFAULT_RETRY_DELAY_MS
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

function createTimeoutSignal(timeoutMs: number): TimeoutSignalHandle {
  if (typeof AbortSignal.timeout === 'function') {
    return {
      signal: AbortSignal.timeout(timeoutMs),
      clear: () => undefined,
    }
  }

  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    clear: () => globalThis.clearTimeout(timeout),
  }
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

function isRetriableStatus(status: number): boolean {
  return RETRIABLE_HTTP_STATUSES.has(status)
}

function classifyFetchError({
  error,
  signal,
  timeoutSignal,
}: {
  readonly error: unknown
  readonly signal: AbortSignal | null | undefined
  readonly timeoutSignal: AbortSignal
}): FetchJsonError {
  if (signal?.aborted) {
    return new FetchJsonError('Request aborted', {
      category: 'abort',
      retriable: false,
      cause: error,
    })
  }

  if (timeoutSignal.aborted) {
    return new FetchJsonError('Request timed out', {
      category: 'timeout',
      retriable: true,
      cause: error,
    })
  }

  if (error instanceof FetchJsonError) return error

  return new FetchJsonError('Network request failed', {
    category: 'network',
    retriable: true,
    cause: error,
  })
}

function createHttpError(status: number): FetchJsonError {
  return new FetchJsonError(`HTTP ${status}`, {
    category: 'http',
    status,
    retriable: isRetriableStatus(status),
  })
}

function createInvalidJsonError(cause: unknown): FetchJsonError {
  return new FetchJsonError('Invalid JSON response', {
    category: 'invalid-json',
    retriable: false,
    cause,
  })
}

function shouldRetry(
  error: FetchJsonError,
  attempt: number,
  retryAttempts: number,
): boolean {
  return error.retriable && attempt < retryAttempts
}

function delay(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  if (ms <= 0) return Promise.resolve()

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new FetchJsonError('Request aborted', {
          category: 'abort',
          retriable: false,
        }),
      )
      return
    }

    const timeout = globalThis.setTimeout(resolve, ms)
    const abort = () => {
      globalThis.clearTimeout(timeout)
      reject(
        new FetchJsonError('Request aborted', {
          category: 'abort',
          retriable: false,
        }),
      )
    }

    signal?.addEventListener('abort', abort, { once: true })
  })
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch (error) {
    throw createInvalidJsonError(error)
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  {
    timeoutMs,
    retryAttempts: rawRetryAttempts,
    retryDelayMs: rawRetryDelayMs,
    signal,
    ...init
  }: FetchJsonOptions,
): Promise<T> {
  const retryAttempts = normalizeRetryAttempts(rawRetryAttempts)
  const retryDelayMs = normalizeRetryDelayMs(rawRetryDelayMs)

  for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw new FetchJsonError('Request aborted', {
        category: 'abort',
        retriable: false,
      })
    }

    const timeout = createTimeoutSignal(timeoutMs)

    try {
      const response = await fetch(input, {
        ...init,
        signal: combineSignals(signal, timeout.signal),
      })

      if (!response.ok) {
        throw createHttpError(response.status)
      }

      return await parseJsonResponse<T>(response)
    } catch (error) {
      const classified = classifyFetchError({
        error,
        signal,
        timeoutSignal: timeout.signal,
      })

      if (!shouldRetry(classified, attempt, retryAttempts)) {
        throw classified
      }

      await delay(retryDelayMs * 2 ** attempt, signal)
    } finally {
      timeout.clear()
    }
  }

  throw new FetchJsonError('Network request failed', {
    category: 'network',
    retriable: true,
  })
}
