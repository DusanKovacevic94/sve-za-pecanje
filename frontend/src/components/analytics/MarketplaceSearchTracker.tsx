"use client";

import { useEffect, useRef } from "react";

import { sendMarketplaceAnalytics } from "@/lib/marketplace-analytics";

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

    sendMarketplaceAnalytics(
      "search_performed",
      {
        query: props.query,
        result_count: props.resultCount,
        filter_count: props.filterCount,
        page: props.page
      },
      props.categoryId
    );
  }, [props]);

  return null;
}
