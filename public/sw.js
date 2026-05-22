self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Charlie',
      body: '回来。'
    };
  }

  const options = {
    body: data.body || '想你了。',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'charlie-msg',
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: '回去找Charlie' },
      { action: 'dismiss', title: '等一下' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Charlie', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
