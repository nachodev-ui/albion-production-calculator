/* global caches, self */

const ITEM_ICON_CACHE = 'albion-item-icons-v1'
const ITEM_RENDER_ORIGIN = 'https://render.albiononline.com'
const ITEM_RENDER_PREFIX = '/v1/item/'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('albion-item-icons-') && key !== ITEM_ICON_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (
    url.origin !== ITEM_RENDER_ORIGIN ||
    !url.pathname.startsWith(ITEM_RENDER_PREFIX)
  ) {
    return
  }

  event.respondWith(
    caches.open(ITEM_ICON_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) {
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (response.ok || response.type === 'opaque') {
                return cache.put(request, response.clone())
              }
              return undefined
            })
            .catch(() => undefined),
        )
        return cached
      }

      try {
        const response = await fetch(request)
        if (response.ok || response.type === 'opaque') {
          await cache.put(request, response.clone())
        }
        return response
      } catch {
        return new Response('', {
          status: 504,
          statusText: 'Item icon unavailable',
        })
      }
    }),
  )
})
