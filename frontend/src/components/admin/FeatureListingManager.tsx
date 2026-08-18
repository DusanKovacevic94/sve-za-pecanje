"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CalendarClockIcon } from "@/components/icons";
import { apiFetch, type ListingCard } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";

function defaultUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 16);
}

export function FeatureListingManager({ listings }: { listings: ListingCard[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
      {listings.map((listing) => (
        <FeatureListingRow key={listing.id} listing={listing} />
      ))}
      {!listings.length ? <p className="p-5 text-slate-600">Nema oglasa za prikaz.</p> : null}
    </div>
  );
}

function FeatureListingRow({ listing }: { listing: ListingCard }) {
  const router = useRouter();
  const [featuredUntil, setFeaturedUntil] = useState(defaultUntil());
  const [message, setMessage] = useState<string | null>(null);

  async function featureListing() {
    setMessage(null);
    try {
      await apiFetch<ListingCard>(`/admin/listings/${listing.id}/feature`, {
        method: "POST",
        body: JSON.stringify({ featured_until: new Date(featuredUntil).toISOString() })
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  }

  return (
    <div className="grid gap-4 border-b border-slate-100 p-4 lg:grid-cols-[1fr_240px_auto]">
      <div>
        <p className="font-bold">{listing.title}</p>
        <p className="mt-1 text-sm text-slate-600">
          {formatPrice(listing.price_amount, listing.currency)} · {listing.city} · {listing.status}
        </p>
        {listing.featured_until ? (
          <p className="mt-1 text-sm font-semibold text-river-700">Istaknuto do {formatDate(listing.featured_until)}</p>
        ) : null}
        {message ? <p className="mt-2 text-sm font-semibold text-red-700">{message}</p> : null}
      </div>
      <div>
        <FieldLabel htmlFor={`featured-${listing.id}`}>Rok isticanja</FieldLabel>
        <Input
          id={`featured-${listing.id}`}
          type="datetime-local"
          value={featuredUntil}
          onChange={(event) => setFeaturedUntil(event.target.value)}
        />
      </div>
      <Button type="button" className="self-end" onClick={featureListing}>
        <CalendarClockIcon size={18} /> Istakni
      </Button>
    </div>
  );
}
