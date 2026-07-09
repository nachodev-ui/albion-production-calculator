import { afterEach, describe, expect, it, vi } from 'vitest'
import { FetchJsonError, fetchJson } from './fetchJson'

describe('fetchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('expone categorías estables de error', () => {
    const error = new FetchJsonError('HTTP 503', {
      category: 'http',
      status: 503,
      retriable: true,
    })

    expect(error).toMatchObject({
      name: 'FetchJsonError',
      category: 'http',
      status: 503,
      retriable: true,
    })
  })

  it('reintenta errores de red transitorios', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockRejectedValueOnce(new TypeError('network down'))

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson<unknown>('https://example.test/status', {
        timeoutMs: 1_000,
        retryAttempts: 1,
        retryDelayMs: 0,
      }),
    ).rejects.toMatchObject({
      category: 'network',
      retriable: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('no ejecuta fetch cuando el signal ya fue abortado', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson<unknown>('https://example.test/status', {
        timeoutMs: 1_000,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      category: 'abort',
      retriable: false,
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
