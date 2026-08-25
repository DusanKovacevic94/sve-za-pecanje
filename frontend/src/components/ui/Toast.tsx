"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { CloseIcon, InfoIcon, SuccessIcon } from "@/components/icons";

type ToastTone = "success" | "info" | "error";
type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const ToastContext = createContext<{ pushToast: (message: string, tone?: ToastTone) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const pushToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }].slice(-4));
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3800);
  }, []);
  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 grid w-[min(92vw,360px)] gap-2" aria-live="polite" aria-atomic="true">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-sand-200 bg-white p-3 text-sm font-semibold text-ink shadow-lift"
          >
            {item.tone === "success" ? (
              <SuccessIcon className="mt-0.5 shrink-0 text-river-600" size={18} />
            ) : (
              <InfoIcon className={`mt-0.5 shrink-0 ${item.tone === "error" ? "text-red-600" : "text-river-600"}`} size={18} />
            )}
            <p className="flex-1">{item.message}</p>
            <button
              type="button"
              className="focus-ring rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Zatvori obaveštenje"
              onClick={() => setItems((current) => current.filter((toast) => toast.id !== item.id))}
            >
              <CloseIcon size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { pushToast: () => undefined };
  }
  return context;
}
