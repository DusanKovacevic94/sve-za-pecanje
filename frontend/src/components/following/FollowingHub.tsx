"use client";

import Link from "next/link";
import { useState } from "react";

import { StoreIcon, UserIcon } from "@/components/icons";
import { apiFetch, type FollowingSeller, type ListingCard as ListingCardType } from "@/lib/api";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/Button";

export function FollowingHub({
  initialListings,
  initialCursor,
  sellers,
}: {
  initialListings: ListingCardType[];
  initialCursor: string | null;
  sellers: FollowingSeller[];
}) {
  const [listings, setListings] = useState(initialListings);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiFetch<ListingCardType[]>(
        `/following/feed?cursor=${encodeURIComponent(cursor)}&limit=24`,
      );
      const known = new Set(listings.map((item) => item.id));
      setListings([
        ...listings,
        ...response.data.filter((item) => !known.has(item.id)),
      ]);
      setCursor(
        typeof response.meta?.next_cursor === "string"
          ? response.meta.next_cursor
          : null,
      );
    } catch {
      setMessage("Nismo uspeli da učitamo još oglasa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header>
        <p className="text-sm font-semibold text-river-700">Praćenje</p>
        <h1 className="mt-1 text-3xl font-extrabold">Prodavci koje pratite</h1>
        <p className="mt-2 text-ink-600">
          Novi aktivni oglasi svih prodavaca i prodavnica koje pratite.
        </p>
      </header>

      <section className="mt-7">
        <h2 className="text-xl font-extrabold">Praćeni prodavci</h2>
        {sellers.length ? (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {sellers.map(({ follow_id, seller }) => {
              const shopHref = seller.shop_slug
                ? `/prodavnice/${seller.shop_slug}`
                : `/prodavci/${seller.username}`;
              return (
                <Link
                  key={follow_id}
                  href={shopHref}
                  className="focus-ring min-w-52 rounded-xl border border-sand-200 bg-white p-4 shadow-soft hover:border-river-300"
                >
                  <div className="flex items-center gap-2 text-river-700">
                    {seller.shop_slug ? <StoreIcon size={18} /> : <UserIcon size={18} />}
                    <span className="text-xs font-bold uppercase">
                      {seller.shop_slug ? "Prodavnica" : "Prodavac"}
                    </span>
                  </div>
                  <p className="mt-2 font-extrabold">
                    {seller.shop_name ?? seller.display_name ?? seller.username}
                  </p>
                  {seller.city ? (
                    <p className="mt-1 text-sm text-ink-500">{seller.city}</p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-sand-200 bg-white p-5 text-ink-600">
            Još ne pratite nijednog prodavca.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-extrabold">Najnoviji oglasi</h2>
        {listings.length ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-sand-200 bg-white p-6 text-ink-600">
            Praćeni prodavci trenutno nemaju aktivne oglase.
          </p>
        )}
        {message ? <p className="mt-4 text-sm font-semibold text-red-700">{message}</p> : null}
        {cursor ? (
          <Button
            type="button"
            variant="secondary"
            onClick={loadMore}
            isLoading={loading}
            className="mt-6"
          >
            Učitaj još
          </Button>
        ) : null}
      </section>
    </div>
  );
}
