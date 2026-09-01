"use client";

import { useCallback, useEffect, useState } from "react";

import { MessageIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function UnreadMessagesLink({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await apiFetch<{ unread_count: number }>("/users/me/unread-count");
      setCount(response.data.unread_count);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const interval = window.setInterval(loadCount, 60_000);
    window.addEventListener("focus", loadCount);
    document.addEventListener("visibilitychange", loadCount);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", loadCount);
      document.removeEventListener("visibilitychange", loadCount);
    };
  }, [loadCount]);

  const badge = count > 0 ? (
    <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-black text-white">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

  if (compact) {
    return (
      <Button href="/nalog/poruke" variant="ghost" className="shrink-0 bg-river-50 px-3 py-2">
        <MessageIcon size={14} /> Poruke {badge}
      </Button>
    );
  }

  return (
    <Button href="/nalog/poruke" variant="ghost" className="hidden px-3 lg:inline-flex">
      <MessageIcon size={18} /> Poruke {badge}
    </Button>
  );
}
