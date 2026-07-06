"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiFetch, type FeaturePackage, type FeatureRequest, type ListingCard } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export function FeatureRequestPanel({
  listing,
  packages,
  requests
}: {
  listing: ListingCard;
  packages: FeaturePackage[];
  requests: FeatureRequest[];
}) {
  const router = useRouter();
  const [packageDays, setPackageDays] = useState(packages[0]?.days ?? 7);
  const [message, setMessage] = useState<string | null>(null);
  const activeRequest = requests.find((request) => request.listing_id === listing.id && request.status === "pending");

  async function requestFeature() {
    setMessage(null);
    try {
      const response = await apiFetch<FeatureRequest>(`/listings/${listing.id}/feature-request`, {
        method: "POST",
        body: JSON.stringify({ package_days: packageDays })
      });
      setMessage(`Zahtev je poslat. Poziv na broj: ${response.data.payment_reference}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Zahtev nije poslat.");
    }
  }

  return (
    <div className="rounded-md border border-river-100 bg-river-50 p-3 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="font-black text-river-800">Isticanje oglasa</p>
          {activeRequest ? (
            <p className="mt-1 text-river-700">Zahtev je na čekanju. Poziv na broj: {activeRequest.payment_reference}</p>
          ) : (
            <select
              className="focus-ring mt-2 min-h-10 w-full rounded-md border border-river-200 bg-white px-3"
              value={packageDays}
              onChange={(event) => setPackageDays(Number(event.target.value))}
            >
              {packages.map((item) => (
                <option key={item.days} value={item.days}>
                  {item.days} dana · {formatPrice(item.price_amount, item.currency)}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button type="button" disabled={Boolean(activeRequest)} onClick={requestFeature}>
          <Megaphone size={16} /> Istakni
        </Button>
      </div>
      {message ? <p className="mt-2 font-semibold text-river-800">{message}</p> : null}
    </div>
  );
}
