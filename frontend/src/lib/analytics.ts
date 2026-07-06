"use client";

type UmamiWindow = Window & {
  umami?: { track: (event: string, data?: Record<string, string | number | boolean>) => void };
};

export function trackEvent(event: string, data?: Record<string, string | number | boolean>) {
  if (process.env.NODE_ENV !== "production") return;
  const umami = (window as UmamiWindow).umami;
  umami?.track(event, data);
}
