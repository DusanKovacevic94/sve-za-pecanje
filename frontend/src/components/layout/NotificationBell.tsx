"use client";

import { useCallback, useEffect, useState } from "react";

import { BellIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { subscribeToNotificationUpdates } from "@/lib/notification-events";

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await apiFetch<{ unread_count: number }>(
        "/notifications/unread-count"
      );
      setCount(response.data.unread_count);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const interval = window.setInterval(loadCount, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") loadCount();
    };
    window.addEventListener("focus", loadCount);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const unsubscribe = subscribeToNotificationUpdates(loadCount);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", loadCount);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribe();
    };
  }, [loadCount]);

  const badge =
    count > 0 ? (
      <span
        className="ml-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-black text-white"
        aria-label={`${count} nepročitanih obaveštenja`}
      >
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  return (
    <Button
      href="/nalog/obavestenja"
      variant="ghost"
      className={
        compact
          ? "bg-river-50 px-3 py-2"
          : "hidden px-3 md:inline-flex"
      }
      aria-label={
        count
          ? `Obaveštenja, ${count} nepročitanih`
          : "Obaveštenja"
      }
    >
      <BellIcon size={compact ? 14 : 18} />
      {compact ? "Obaveštenja" : <span className="sr-only">Obaveštenja</span>}
      {badge}
    </Button>
  );
}
