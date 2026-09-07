"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";

export function AnalyticsScript() {
  const pathname = usePathname();
  const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  const websiteId = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID;
  if (pathname === "/blog/preview" || pathname.startsWith("/blog/preview/") || !analyticsUrl || !websiteId || process.env.NODE_ENV !== "production") {
    return null;
  }
  return (
    <Script
      src={`${analyticsUrl.replace(/\/$/, "")}/script.js`}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
