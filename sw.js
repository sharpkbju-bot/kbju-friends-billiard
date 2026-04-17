// 캐시 버전을 v5.31로 올려 이전의 결함 있는 캐시를 모두 초기화합니다.
const CACHE_NAME = 'billiard-v5.31';

// 설치 시 신규 파일 캐시 저장
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './main.js',
        './manifest.json',
        './image_0.png',
        './image_1.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // 현재 버전(v5.31)과 다른 모든 이전 캐시를 삭제하여 업데이트를 강제 적용합니다.
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});