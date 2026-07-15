self.addEventListener("push", (event) => {
  let message = {
    title: "Bussin",
    body: "You have a new bus update.",
    url: "/",
  };

  if (event.data) {
    try {
      message = {
        ...message,
        ...event.data.json(),
      };
    } catch {
      message.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "bussin-leave-alert",
      renotify: true,
      data: {
        url: message.url || "/",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windows) => {
        for (const windowClient of windows) {
          if ("focus" in windowClient) {
            windowClient.navigate(targetUrl);
            return windowClient.focus();
          }
        }

        return clients.openWindow(targetUrl);
      }),
  );
});
