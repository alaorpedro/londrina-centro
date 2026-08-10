/*
  Service worker mínimo — o suficiente para o app ser instalável na tela inicial
  e abrir sem rede travando na primeira tela.

  De propósito NÃO faz cache de /api: cupom, saldo de assinatura e limite de
  resgate precisam ser sempre a verdade do servidor. Um cupom servido do cache
  seria um código já queimado na mão do morador dentro da loja.
*/

const CACHE = 'lc-v1'
const CASCA = ['/', '/icone.svg', '/manifest.webmanifest']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)))
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url)

  if (evento.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api')) return

  // navegação: rede primeiro, cache como rede de segurança
  if (evento.request.mode === 'navigate') {
    evento.respondWith(
      fetch(evento.request).catch(() => caches.match('/').then((r) => r ?? Response.error())),
    )
    return
  }

  evento.respondWith(
    caches.match(evento.request).then(
      (achou) =>
        achou ??
        fetch(evento.request).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone()
            caches.open(CACHE).then((c) => c.put(evento.request, copia))
          }
          return resposta
        }),
    ),
  )
})
