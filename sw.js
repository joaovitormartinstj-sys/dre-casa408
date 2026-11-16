// Service worker: guarda a "casca" do app no celular para abrir rápido e sem internet.
// Os dados NÃO passam por aqui: vêm do Apps Script e ficam no cache do próprio app.
// Ao publicar uma versão nova do index.html, aumente o número abaixo.
const VERSAO = 'dre-v1';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSAO).then(c => Promise.all(ARQUIVOS.map(u => c.add(u).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                    // chamadas à API (POST) vão direto
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // Página: tenta a rede primeiro (pega atualizações), cai no cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copia = r.clone();
        caches.open(VERSAO).then(c => c.put('./index.html', copia));
        return r;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Demais arquivos (ícones, Chart.js): cache primeiro, rede se não tiver
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(resp => {
      const copia = resp.clone();
      caches.open(VERSAO).then(c => c.put(req, copia));
      return resp;
    }))
  );
});
