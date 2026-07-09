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
