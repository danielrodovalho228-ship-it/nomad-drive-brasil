/* ============================================================
 * Nomade Drive Brasil — Service Worker (Fase 33b — Web Push)
 * ============================================================
 * Responsável por:
 *   - Receber push notifications do servidor
 *   - Mostrar a notificação no SO do usuário
 *   - Abrir a URL correta quando o usuário clica
 *
 * NÃO faz cache de assets — esse SW é exclusivo pra push.
 * Se no futuro quisermos PWA com cache offline, estender aqui.
 * ============================================================ */

const VERSION = 'nd-sw-v1';

self.addEventListener('install', function (event) {
  // Ativa imediatamente sem esperar nova versão
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Toma controle de páginas abertas
  event.waitUntil(self.clients.claim());
});

/**
 * Handler de push: chamado quando o servidor envia push via VAPID.
 * O payload (data) deve ser JSON com { title, body, icon?, url?, tag? }.
 */
self.addEventListener('push', function (event) {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data = { title: 'Nomade Drive Brasil', body: event.data ? event.data.text() : 'Nova notificação.' };
  }

  const title = data.title || 'Nomade Drive Brasil';
  const options = {
    body: data.body || '',
    icon: data.icon || '/images/favicon.svg',
    badge: data.badge || '/images/favicon.svg',
    tag: data.tag || 'nomade-drive',     // tags iguais substituem (não acumulam)
    renotify: data.renotify || false,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data.data
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Click na notificação: abre a URL (ou foca uma aba já aberta).
 */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Se já tem aba do Nomade Drive aberta, foca nela
      for (let i = 0; i < windowClients.length; i++) {
        const c = windowClients[i];
        if (c.url.indexOf(self.location.origin) === 0) {
          c.focus();
          if ('navigate' in c) c.navigate(absoluteUrl);
          return;
        }
      }
      // Senão, abre nova
      if (self.clients.openWindow) return self.clients.openWindow(absoluteUrl);
    })
  );
});

/**
 * Subscription change: re-registra automaticamente se trocar.
 * (Browsers ocasionalmente regeram a subscription.)
 */
self.addEventListener('pushsubscriptionchange', function (event) {
  // Avisa a página pra renovar subscription com o backend
  event.waitUntil(
    self.clients.matchAll().then(function (clients) {
      clients.forEach(function (c) {
        c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    })
  );
});
