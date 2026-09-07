"use client";

import { publicApiUrl } from "@/lib/api";

export function trackBlogEvent(
  event: "blog_viewed" | "blog_category_clicked" | "blog_listing_clicked",
  postId: string,
  viewId: string,
  targetId?: string,
) {
  // Intentionally no localStorage/cookies, user identity, URL, title or referrer.
  void fetch(`${publicApiUrl}/analytics/events`, {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    referrerPolicy: "no-referrer",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_event_id: crypto.randomUUID(),
      event_name: event,
      anonymous_id: viewId,
      properties: {
        post_id: postId,
        view_id: viewId,
        ...(targetId ? { target_id: targetId } : {}),
      },
    }),
  }).catch(() => undefined);
}

type UmamiWindow = Window & {
  umami?: {
    track: (
      event: string,
      data?: Record<string, string | number | boolean>,
    ) => void;
  };
};

export function trackEvent(
  event: string,
  data?: Record<string, string | number | boolean>,
) {
  if (process.env.NODE_ENV !== "production") return;
  const umami = (window as UmamiWindow).umami;
  umami?.track(event, data);
}
