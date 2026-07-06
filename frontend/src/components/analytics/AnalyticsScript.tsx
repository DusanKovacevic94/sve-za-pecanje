import Script from "next/script";

export function AnalyticsScript() {
  const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  const websiteId = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID;
  if (!analyticsUrl || !websiteId || process.env.NODE_ENV !== "production") {
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
