"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, type FeatureRequest } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export function FeatureRequestManager({ requests }: { requests: FeatureRequest[] }) {
  if (!requests.length) {
    return <p className="rounded-lg bg-white p-5 text-slate-600 shadow-soft">Nema zahteva za isticanje.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
      {requests.map((request) => (
        <FeatureRequestRow key={request.id} request={request} />
      ))}
    </div>
  );
}

function FeatureRequestRow({ request }: { request: FeatureRequest }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function resolve(action: "approve" | "reject") {
    setMessage(null);
    try {
      await apiFetch(`/admin/feature-requests/${request.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ admin_note: null })
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  return (
    <div className="grid gap-4 border-b border-slate-100 p-4 lg:grid-cols-[1fr_auto]">
      <div>
        <p className="font-bold">{request.listing?.title ?? request.listing_id}</p>
        <p className="mt-1 text-sm text-slate-600">
          {request.user?.email ?? request.user_id} · {request.type_label} ·{" "}
          {request.package_days ? `${request.package_days} dana · ` : ""}
          {formatPrice(request.price_amount, request.currency)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Poziv na broj: <span className="font-bold">{request.payment_reference}</span> · {formatDate(request.created_at)}
        </p>
        {message ? <p className="mt-2 text-sm font-semibold text-red-700">{message}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 self-center">
        <Button type="button" onClick={() => resolve("approve")}>
          <Check size={16} /> Potvrdi
        </Button>
        <Button type="button" variant="danger" onClick={() => resolve("reject")}>
          <X size={16} /> Odbij
        </Button>
      </div>
    </div>
  );
}
