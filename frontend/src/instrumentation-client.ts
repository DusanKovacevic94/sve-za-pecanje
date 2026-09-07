import * as Sentry from "@sentry/nextjs";

// Do not initialize telemetry on editor-only handoff/preview pages: fragments,
// draft content and capability cookies must not enter monitoring breadcrumbs.
if (process.env.NEXT_PUBLIC_SENTRY_DSN && !/^\/blog\/preview(?:\/|$)/.test(window.location.pathname)) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0"),
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV
  });
}
