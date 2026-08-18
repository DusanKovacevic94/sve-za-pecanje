"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PromotionIcon } from "@/components/icons";
import { apiFetch, type FeatureRequest, type ListingCard, type PromotionPackage } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function FeatureRequestPanel({
  listing,
  packages,
  requests
}: {
  listing: ListingCard;
  packages: PromotionPackage[];
  requests: FeatureRequest[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const availablePackages = useMemo(() => packages, [packages]);
  const [optionId, setOptionId] = useState(availablePackages[0]?.option_id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selected = availablePackages.find((item) => item.option_id === optionId) ?? availablePackages[0];
  const activeRequest = requests.find(
    (request) => request.listing_id === listing.id && request.status === "pending" && request.type === selected?.type
  );

  async function requestPromotion() {
    if (!selected) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<FeatureRequest>(`/listings/${listing.id}/feature-request`, {
        method: "POST",
        body: JSON.stringify({ type: selected.type, package_days: selected.days })
      });
      const nextMessage = `Zahtev je poslat. Poziv na broj: ${response.data.payment_reference}`;
      setMessage(nextMessage);
      pushToast("Zahtev za promociju je poslat.", "success");
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Zahtev nije poslat.";
      setMessage(errorMessage);
      pushToast(errorMessage, "error");
    } finally {
      setPending(false);
    }
  }

  if (!availablePackages.length) return null;

  return (
    <div className="rounded-lg border border-river-100 bg-river-50 p-3 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="font-black text-river-800">Promoviši oglas</p>
          {activeRequest ? (
            <p className="mt-1 text-river-700">
              Zahtev za {activeRequest.type_label.toLowerCase()} je na čekanju. Poziv na broj:{" "}
              {activeRequest.payment_reference}
            </p>
          ) : (
            <>
              <select
                className="focus-ring mt-2 min-h-10 w-full rounded-md border border-river-200 bg-white px-3"
                value={selected?.option_id ?? ""}
                onChange={(event) => setOptionId(event.target.value)}
              >
                {availablePackages.map((item) => (
                  <option key={item.option_id} value={item.option_id}>
                    {item.label}
                    {item.days ? ` · ${item.days} dana` : ""} · {formatPrice(item.price_amount, item.currency)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-semibold text-river-800">{selected?.description}</p>
            </>
          )}
        </div>
        <Button type="button" disabled={Boolean(activeRequest) || pending} isLoading={pending} onClick={requestPromotion}>
          <PromotionIcon size={16} /> Promoviši
        </Button>
      </div>
      {message ? <p className="mt-2 font-semibold text-river-800">{message}</p> : null}
    </div>
  );
}
