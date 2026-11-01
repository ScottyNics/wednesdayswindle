const CACHE_NAME = "wednesday-swindle-network-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name === "purple-golf-v1")
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) return;

  event.respondWith((async () => {
    let response;

    try {
      response = await fetch(request, { cache: "no-store" });
    } catch {
      // Try saved files if the network is unavailable.
    }

    if (response && response.ok) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      } catch {
        // Storage problems must not stop the website loading.
      }
      return response;
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match(request);
      if (saved) return saved;
    } catch {
      // Continue to the recovery response below.
    }

    if (response) return response;

    if (request.mode === "navigate") {
      return new Response(
        '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wednesday Swindle</title><body><h1>Unable to load Wednesday Swindle</h1><p>Please check your internet connection and try again.</p><button onclick="location.reload()">Try again</button></body></html>',
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          }
        }
      );
    }

    return Response.error();
  })());
});
