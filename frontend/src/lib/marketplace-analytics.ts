"use client";

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

export function sendMarketplaceAnalytics(
  eventName:
    | "search_performed"
    | "suggestion_impression"
    | "suggestion_selected"
    | "zero_result_recovery",
  properties: Record<string, unknown>,
  categoryId: string | null = null
) {
  const payload = {
    client_event_id: randomId(),
    event_name: eventName,
    anonymous_id: anonymousId(),
    category_id: categoryId,
    properties
  };
  fetch(`${publicApiUrl}/analytics/events`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => undefined);
}
