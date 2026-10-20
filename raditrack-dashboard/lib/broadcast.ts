/**
 * Broadcast channel helper to notify other open tabs/windows
 * (such as the Staff Dashboard) immediately when a scan is logged or modified.
 */
export function notifyDatabaseChanged(channelName: string = "raditrack_sync") {
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage("DB_CHANGED");
      channel.close();
    }
  } catch {
    // Fail silently in environments without BroadcastChannel
  }
}
