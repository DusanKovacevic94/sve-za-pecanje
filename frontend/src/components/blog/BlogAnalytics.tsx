"use client";

import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { trackBlogEvent } from "@/lib/analytics";

export type BlogTarget = {
  path: string;
  id: string;
  kind: "category" | "listing";
};

export function BlogAnalytics({
  postId,
  enabled,
  targets,
  children,
}: {
  postId: string;
  enabled: boolean;
  targets: BlogTarget[];
  children: ReactNode;
}) {
  const view = useRef<string | null>(null);
  const sent = useRef(new Set<string>());
  const permitted = () =>
    enabled &&
    !navigator.webdriver &&
    navigator.doNotTrack !== "1" &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl &&
    !/^\/blog\/preview(?:\/|$)/.test(window.location.pathname);
  useEffect(() => {
    if (!permitted()) return;
    const record = () => {
      if (
        !permitted() ||
        document.visibilityState !== "visible" ||
        view.current
      )
        return;
      view.current = crypto.randomUUID();
      trackBlogEvent("blog_viewed", postId, view.current);
    };
    record();
    document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
    // One view per mounted public document; props are fixed by its server render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const click = (event: MouseEvent<HTMLDivElement>) => {
    if (!permitted() || !view.current || ![0, 1].includes(event.button)) return;
    const anchor = (event.target as Element).closest("a");
    if (!anchor) return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return;
    const target = targets.find((item) => item.path === url.pathname);
    if (!target) return;
    const key = `${target.kind}:${target.id}`;
    if (sent.current.has(key)) return;
    sent.current.add(key);
    trackBlogEvent(
      target.kind === "category"
        ? "blog_category_clicked"
        : "blog_listing_clicked",
      postId,
      view.current,
      target.id,
    );
  };
  return (
    <div onClickCapture={click} onAuxClickCapture={click}>
      {children}
    </div>
  );
}
