// Service worker mínimo: habilita la instalación como PWA sin cachear nada.
// Todo pasa directo a la red, así las páginas protegidas nunca se sirven desde caché sin sesión.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
