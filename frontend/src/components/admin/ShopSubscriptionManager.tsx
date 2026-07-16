"use client";

import { useState } from "react";

import { apiFetch, type ShopSubscriptionRequest } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export function ShopSubscriptionManager({ requests }: { requests: ShopSubscriptionRequest[] }) {
  const [items, setItems] = useState(requests);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(requestId: string, action: "approve" | "reject") {
    setBusyId(requestId);
    try {
      const response = await apiFetch<ShopSubscriptionRequest>(`/admin/shop-subscription-requests/${requestId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ admin_note: action === "approve" ? "Aktivirano iz admin panela." : "Odbijeno iz admin panela." })
      });
      setItems((current) => current.map((item) => (item.id === requestId ? response.data : item)));
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) {
    return <p className="rounded-lg border border-slate-200 bg-white p-5 text-slate-600 shadow-soft">Nema zahteva za prodavnice.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((request) => (
        <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black">{request.user?.shop_name ?? request.user?.username ?? request.user_id}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {request.plan_label} · {formatPrice(request.price_amount, request.currency)} · {request.status}
              </p>
              <p className="mt-1 text-sm text-slate-600">Poziv na broj: {request.payment_reference}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(request.created_at)}</p>
            </div>
            {request.status === "pending" ? (
              <div className="flex gap-2">
                <Button type="button" onClick={() => resolve(request.id, "approve")} isLoading={busyId === request.id}>
                  Aktiviraj
                </Button>
                <Button type="button" variant="secondary" onClick={() => resolve(request.id, "reject")} disabled={busyId === request.id}>
                  Odbij
                </Button>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
