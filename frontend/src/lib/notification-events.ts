const CHANNEL_NAME = "sve-za-pecanje-notifications";
const STORAGE_KEY = "notification-center-updated";

export function announceNotificationUpdate() {
  const value = `${Date.now()}:${Math.random()}`;
  window.localStorage.setItem(STORAGE_KEY, value);
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(value);
    channel.close();
  }
}

export function subscribeToNotificationUpdates(callback: () => void) {
  const channel =
    "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
  const onMessage = () => callback();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  channel?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.removeEventListener("message", onMessage);
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
