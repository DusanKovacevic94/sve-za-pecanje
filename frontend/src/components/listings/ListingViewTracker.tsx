"use client";

import { useEffect } from "react";

import { publicApiUrl } from "@/lib/api";

export function ListingViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    const url = `${publicApiUrl}/listings/${listingId}/track-view`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
      return;
    }
    fetch(url, { method: "POST", credentials: "include", keepalive: true }).catch(() => undefined);
  }, [listingId]);

  return null;
}
