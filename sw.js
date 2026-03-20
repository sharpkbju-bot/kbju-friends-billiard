self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activated');
});

self.addEventListener('fetch', (e) => {
  // 설치 버튼 활성화를 위한 필수 핸들러 (내용은 비어있어도 무관)
});
