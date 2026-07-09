import { afterEach, describe, expect, it, vi } from 'vitest'
import { FetchJsonError, fetchJson } from './fetchJson'

describe('fetchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reintenta respuestas HTTP transitorias', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('service unavailable', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson<{ readonly ok: boolean }>('https://example.test/status', {
        timeoutMs: 1_000,
        retryDelayMs: 0,
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('no reintenta respuestas HTTP permanentes', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'bad' }), { status: 400 }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson<unknown>('https://example.test/status', {
        timeoutMs: 1_000,
        retryAttempts: 3,
        retryDelayMs: 0,
      }),
    ).rejects.toMatchObject({
      category: 'http',
      status: 400,
      retriable: false,
    } satisfies Partial<FetchJsonError>)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('clasifica respuestas JSON inválidas como no reintentables', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson<unknown>('https://example.test/status', {
        timeoutMs: 1_000,
        retryAttempts: 3,
        retryDelayMs: 0,
      }),
    ).rejects.toMatchObject({
      category: 'invalid-json',
      retriable: false,
    } satisfies Partial<FetchJsonError>)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('no ejecuta fetch cuando el signal ya fue abortado', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchJson<unknown>('https://example.test/status', {
        timeoutMs: 1_000,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      category: 'abort',
      retriable: false,
    } satisfies Partial<FetchJsonError>)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
