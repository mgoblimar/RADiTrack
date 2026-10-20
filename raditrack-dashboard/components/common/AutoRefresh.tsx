"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /**
   * Interval in milliseconds between background refreshes.
   * Defaults to 10000 (10 seconds).
   */
  intervalMs?: number;
  /**
   * Optional channel name to listen for instant cross-tab events.
   * Defaults to "raditrack_sync".
   */
  channelName?: string;
}

export function AutoRefresh({
  intervalMs = 10000,
  channelName = "raditrack_sync",
}: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    // 1. Periodic background timer (runs only when tab is visible to save CPU/battery)
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    // 2. Instant cross-tab broadcast listener (e.g. scan logged in Simulator tab)
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel(channelName);
        channel.onmessage = (event) => {
          if (event?.data === "DB_CHANGED") {
            router.refresh();
          }
        };
      }
    } catch {
      // BroadcastChannel not supported in environment
    }

    return () => {
      clearInterval(timer);
      if (channel) {
        channel.close();
      }
    };
  }, [intervalMs, channelName, router]);

  return null;
}
