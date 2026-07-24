"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { sendMarketplaceAnalytics } from "@/lib/marketplace-analytics";

export function TrackedRecoveryLink({
  href,
  action,
  removedFilter,
  className,
  children
}: {
  href: string;
  action:
    | "spelling"
    | "remove_filter"
    | "related_category"
    | "recent_listing"
    | "save_search";
  removedFilter?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        sendMarketplaceAnalytics("zero_result_recovery", {
          recovery_action: action,
          removed_filter: removedFilter
        })
      }
    >
      {children}
    </Link>
  );
}

export function TrackedRecoveryContainer({
  action,
  children
}: {
  action: "recent_listing";
  children: ReactNode;
}) {
  return (
    <div
      onClickCapture={() =>
        sendMarketplaceAnalytics("zero_result_recovery", {
          recovery_action: action
        })
      }
    >
      {children}
    </div>
  );
}
