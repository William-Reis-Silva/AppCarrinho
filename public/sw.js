const CACHE_NAME = 'carrinho-v2.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/Agenda.html',
  '/Cadastro.html',
  '/Perfil.html',
  '/CSS/menu.css',
  '/CSS/Home.css',
  '/CSS/Login.css',
  '/CSS/Agenda.css',
  '/CSS/Perfil.css',
  '/JS/firebaseconfig.js',
  '/JS/Index.js',
  '/JS/script.js',
  '/JS/Cadastro.js',
  '/JS/Perfilagendamento.js',
  '/JS/Perfilrelatorio.js',
  '/manifest.json',
  '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições não-GET e recursos externos (Firebase, CDN)
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('jsdelivr')
  ) {
    return;
  }

  // Navegação: rede primeiro, cache como fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets estáticos: cache primeiro, rede como fallback
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
