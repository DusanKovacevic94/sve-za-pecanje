"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  BellIcon,
  DoubleCheckIcon,
  ExternalLinkIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  apiFetch,
  type ApiResponse,
  type NotificationItem,
} from "@/lib/api";
import {
  announceNotificationUpdate,
  subscribeToNotificationUpdates,
} from "@/lib/notification-events";

type NotificationPage = ApiResponse<NotificationItem[]> & {
  meta?: { next_cursor?: string | null };
};

const formatter = new Intl.DateTimeFormat("sr-Latn-RS", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = items.filter((item) => !item.read_at).length;

  const loadFirstPage = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await apiFetch<NotificationItem[]>(
        "/notifications?limit=20"
      ) as NotificationPage;
      setItems(response.data);
      setCursor(response.meta?.next_cursor ?? null);
      setError("");
    } catch {
      setError("Obaveštenja trenutno nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFirstPage();
    const interval = window.setInterval(loadFirstPage, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") loadFirstPage();
    };
    window.addEventListener("focus", loadFirstPage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const unsubscribe = subscribeToNotificationUpdates(loadFirstPage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", loadFirstPage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribe();
    };
  }, [loadFirstPage]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await apiFetch<NotificationItem[]>(
        `/notifications?limit=20&cursor=${encodeURIComponent(cursor)}`
      ) as NotificationPage;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...response.data.filter((item) => !seen.has(item.id)),
        ];
      });
      setCursor(response.meta?.next_cursor ?? null);
      setError("");
    } catch {
      setError("Sledeću stranicu nije moguće učitati.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function markRead(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.read_at) return;
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? { ...candidate, read_at: new Date().toISOString() }
          : candidate
      )
    );
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "POST" });
      announceNotificationUpdate();
    } catch {
      await loadFirstPage();
    }
  }

  async function markAllRead() {
    if (!unreadCount) return;
    const readAt = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? readAt }))
    );
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      announceNotificationUpdate();
    } catch {
      await loadFirstPage();
    }
  }

  return (
    <section aria-labelledby="notification-center-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-river-700">
            Moj nalog
          </p>
          <h1
            id="notification-center-title"
            className="mt-1 text-3xl font-black text-ink"
          >
            Obaveštenja
          </h1>
          <p className="mt-2 text-slate-600">
            Važne promene u vezi sa porukama, oglasima i pretragama.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={markAllRead}
          disabled={!unreadCount}
        >
          <DoubleCheckIcon size={18} />
          Označi sve kao pročitano
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        {unreadCount
          ? `${unreadCount} nepročitanih obaveštenja`
          : "Nema nepročitanih obaveštenja"}
      </p>

      {error ? (
        <Alert tone="error" className="mt-6">
          {error}{" "}
          <button className="underline" type="button" onClick={loadFirstPage}>
            Pokušaj ponovo
          </button>
        </Alert>
      ) : null}

      {loading ? (
        <p className="mt-8 text-slate-600" role="status">
          Učitavanje obaveštenja…
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-soft">
          <BellIcon className="mx-auto text-river-600" size={32} />
          <h2 className="mt-3 text-xl font-black text-ink">
            Još nema obaveštenja
          </h2>
          <p className="mt-2 text-slate-600">
            Ovde će se pojaviti važne promene na vašem nalogu.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 space-y-3" aria-label="Lista obaveštenja">
        {items.map((item) => (
          <li
            key={item.id}
            className={[
              "rounded-lg border bg-white p-4 shadow-soft",
              item.read_at
                ? "border-slate-200"
                : "border-river-300 bg-river-50/40",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <span
                className={[
                  "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
                  item.read_at ? "bg-slate-300" : "bg-river-600",
                ].join(" ")}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-black text-ink">
                    {item.title}
                    {item.group_count > 1 ? (
                      <span className="ml-2 text-sm text-river-700">
                        ({item.group_count})
                      </span>
                    ) : null}
                  </h2>
                  <time
                    className="text-xs font-semibold text-slate-500"
                    dateTime={item.last_event_at}
                  >
                    {formatter.format(new Date(item.last_event_at))}
                  </time>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {item.href ? (
                    <Link
                      className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-black text-river-700 hover:text-river-900"
                      href={item.href}
                      onClick={() => markRead(item.id)}
                    >
                      Otvori <ExternalLinkIcon size={14} />
                    </Link>
                  ) : null}
                  {!item.read_at ? (
                    <button
                      type="button"
                      className="focus-ring rounded-md text-sm font-semibold text-slate-600 underline hover:text-ink"
                      onClick={() => markRead(item.id)}
                    >
                      Označi kao pročitano
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {cursor ? (
        <div className="mt-6 text-center">
          <Button
            type="button"
            variant="secondary"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Učitavanje…" : "Učitaj još"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
