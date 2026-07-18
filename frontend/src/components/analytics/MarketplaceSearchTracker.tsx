"use client";

import { useEffect, useRef } from "react";

import { publicApiUrl } from "@/lib/api";

const ANONYMOUS_ID_KEY = "szp_marketplace_anonymous_id";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function anonymousId() {
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;
  const created = randomId();
  window.localStorage.setItem(ANONYMOUS_ID_KEY, created);
  return created;
}

type MarketplaceSearchTrackerProps = {
  query: string | null;
  resultCount: number;
  filterCount: number;
  page: number;
  categoryId: string | null;
};

export function MarketplaceSearchTracker(props: MarketplaceSearchTrackerProps) {
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = JSON.stringify(props);
    if (trackedKey.current === key) return;
    trackedKey.current = key;

    const payload = {
      client_event_id: randomId(),
      event_name: "search_performed",
      anonymous_id: anonymousId(),
      category_id: props.categoryId,
      properties: {
        query: props.query,
        result_count: props.resultCount,
        filter_count: props.filterCount,
        page: props.page
      }
    };
    fetch(`${publicApiUrl}/analytics/events`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => undefined);
  }, [props]);

  return null;
}
