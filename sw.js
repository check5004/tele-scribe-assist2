/**
 * 簡易キャッシュバスティング用 Service Worker
 *
 * 目的:
 * - `version.txt` に記載されたアプリバージョンに連動してキャッシュ名を切り替え、
 *   デプロイ毎に確実に最新アセットへ更新させる
 * - HTML は network-first、その他静的資産は stale-while-revalidate で高速化
 * - オフライン時には `offline.html` をフォールバックとして返却
 */

const VERSION = self.registration ? (self.registration.scope && 'unknown') : 'unknown';
const CACHE_PREFIX = 'telescribe-cache-';

// スコープに応じてサブパス配下でも正しく参照できるように解決
function resolveInScope(name) {
  try {
    const basePath = (self.registration && self.registration.scope)
      ? new URL(self.registration.scope).pathname
      : new URL(self.location.href).pathname.replace(/[^/]*$/, '/');
    const normalizedBase = basePath.endsWith('/') ? basePath : basePath + '/';
    return normalizedBase + name.replace(/^\//, '');
  } catch (_) {
    return '/' + name.replace(/^\//, '');
  }
}

const APP_VERSION_URL = resolveInScope('version.txt');
const OFFLINE_PATH = resolveInScope('offline.html');

/**
 * 有効キャッシュ名を1回だけ決定して以後は使い回す
 * - version.txt が取得できない場合は dev を使用
 *
 * @returns {Promise<string>} キャッシュ名
 */
const activeCacheNamePromise = (async () => {
  try {
    const res = await fetch(APP_VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return `${CACHE_PREFIX}dev`;
    const text = (await res.text() || '').trim() || 'dev';
    return `${CACHE_PREFIX}${text}`;
  } catch (_) {
    return `${CACHE_PREFIX}dev`;
  }
})();

self.addEventListener('install', (event) => {
  // 即時有効化
  self.skipWaiting();
  // オフラインフォールバックのプリキャッシュ
  event.waitUntil((async () => {
    try {
      const cacheName = await activeCacheNamePromise;
      const cache = await caches.open(cacheName);
      await cache.add(new Request(OFFLINE_PATH, { cache: 'reload' }));
    } catch (_) {}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keep = await activeCacheNamePromise;
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== keep)
          .map((k) => caches.delete(k))
      );
    } catch (_) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // 非GETはキャッシュ対象外として素通し
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return; // 外部CDNはそのまま

  // version.txt はバージョン判定用に常にネットワーク直通で取得し、
  // SW の fetch ハンドラでは特別扱いして再帰を避ける
  if (url.pathname === '/version.txt' || url.pathname.endsWith('/version.txt')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  event.respondWith((async () => {
    const cacheName = await activeCacheNamePromise;
    const cache = await caches.open(cacheName);

    // HTMLは常にネットワーク優先で最新を取得
    if (request.mode === 'navigate' || request.destination === 'document') {
      try {
        const net = await fetch(request, { cache: 'no-store' });
        if (net && net.ok) {
          try { await cache.put(request, net.clone()); } catch (_) {}
        }
        return net;
      } catch (_) {
        // 1) 同一URLのキャッシュ
        const cached = await cache.match(request);
        if (cached) return cached;
        // 2) オフラインフォールバック
        const fallback = await cache.match(OFFLINE_PATH);
        if (fallback) return fallback;
        throw _;
      }
    }

    // その他の同一オリジン静的ファイルは stale-while-revalidate
    const cached = await cache.match(request);
    const networkPromise = fetch(request).then((resp) => {
      if (resp && resp.ok) {
        try { cache.put(request, resp.clone()); } catch (_) {}
      }
      return resp;
    }).catch(() => cached);

    return cached || networkPromise;
  })());
});


