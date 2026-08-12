const COMI_SW_VERSION = "comi-sw-2026-08-13-iphone-cache-fix";
const BERRY_CACHE_PREFIXES = [
  "berry-chat-",
  "berry-chat-v2-",
  "comi-",
  "workbox-",
  "next-pwa-",
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "COMI_SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "COMI_VERSION") {
    event.source?.postMessage({
      type: "COMI_SW_VERSION",
      version: COMI_SW_VERSION,
    });
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) =>
              BERRY_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() => fetch(request)),
    );
  }
});
