"use client";

import { useEffect, useRef } from "react";

import { Alert } from "@/components/ui/Alert";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const scriptURL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileChallenge({
  onToken
}: {
  onToken: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey || !container.current) return;
    let widgetId: string | null = null;
    let cancelled = false;

    function render() {
      if (cancelled || !container.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: sitekey!,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null)
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptURL}"]`);
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = scriptURL;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return <Alert tone="error">Bezbednosna provera nije podešena. Pokušajte ponovo kasnije.</Alert>;
  }
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-700">Potvrdite bezbednosnu proveru.</p>
      <div ref={container} />
    </div>
  );
}
