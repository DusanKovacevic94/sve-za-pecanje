"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CloseIcon, FiltersIcon } from "@/components/icons";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

function filterCountLabel(count: number) {
  if (count === 0) return "Nema izabranih filtera";
  if (count === 1) return "1 izabran filter";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
    return `${count} izabrana filtera`;
  }
  return `${count} izabranih filtera`;
}

function resultCountLabel(count: number) {
  return `${count} ${count === 1 ? "rezultat" : "rezultata"}`;
}

export function FilterDrawer({
  children,
  selectedCount,
  resultCount,
  formId,
  resetHref = "/oglasi"
}: {
  children: ReactNode;
  selectedCount: number;
  resultCount: number;
  formId: string;
  resetHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const fallbackTrigger = triggerRef.current;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const restoreTarget = restoreFocusRef.current ?? fallbackTrigger;
      window.requestAnimationFrame(() => restoreTarget?.focus());
    };
  }, [close, open]);

  return (
    <div className="min-w-0 lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-filter-drawer"
        onClick={() => setOpen(true)}
        className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-sand-300 bg-white px-4 py-3 text-left font-bold text-ink shadow-soft"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FiltersIcon aria-hidden="true" size={18} />
          Filteri
        </span>
        {selectedCount ? (
          <span className="rounded-full bg-river-700 px-2.5 py-1 text-xs text-white">
            {selectedCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/45"
            aria-hidden="true"
            onMouseDown={close}
          />
          <div
            ref={panelRef}
            id="mobile-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-full max-w-md min-w-0 flex-col overflow-hidden bg-sand-50 shadow-lift"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-sand-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 id="mobile-filter-title" className="text-lg font-black text-ink">Filteri</h2>
                <p className="text-xs text-slate-600">
                  {filterCountLabel(selectedCount)}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Zatvori filtere"
                onClick={close}
                className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-sand-100"
              >
                <CloseIcon aria-hidden="true" size={20} />
              </button>
            </header>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4">
              {children}
            </div>

            <footer className="grid shrink-0 grid-cols-[auto_1fr] gap-2 border-t border-sand-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
              <Link
                href={resetHref}
                onClick={close}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold text-river-800 hover:bg-river-50"
              >
                Poništi
              </Link>
              <button
                type="submit"
                form={formId}
                className="focus-ring min-h-11 min-w-0 rounded-xl bg-river-700 px-3 py-2 text-sm font-bold text-white shadow-button hover:bg-river-800"
              >
                Prikaži {resultCountLabel(resultCount)}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
