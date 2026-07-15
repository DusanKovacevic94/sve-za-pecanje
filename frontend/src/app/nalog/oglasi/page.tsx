import { ListingCard } from "@/components/listings/ListingCard";
import { OwnerListingActions } from "@/components/listings/ListingActions";
import { FeatureRequestPanel } from "@/components/listings/FeatureRequestPanel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FeatureRequest, ListingCard as ListingCardType, PromotionPackage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { serverApiFetch } from "@/lib/server-api";

export default async function MyListingsPage() {
  const listings = await serverApiFetch<ListingCardType[]>("/users/me/listings").catch(() => ({
    data: [],
  }));
  const packages = await serverApiFetch<PromotionPackage[]>("/promotions/packages").catch(() => ({ data: [] }));
  const requests = await serverApiFetch<FeatureRequest[]>("/listings/feature/requests").catch(() => ({ data: [] }));
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Moji oglasi</h1>
        <Button href="/postavi-oglas">Postavi oglas</Button>
      </div>
      <div className="mt-4 rounded-md border border-river-100 bg-river-50 p-4 text-sm text-river-900">
        Za promociju oglasa izaberite paket i pošaljite zahtev. Uplatu izvršite na račun koji je naveden u
        instrukcijama za plaćanje, a kao poziv na broj unesite ID zahteva. Admin potvrđuje isticanje po evidentiranoj
        uplati.
      </div>
      {listings.data.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {listings.data.map((listing) => (
            <div key={listing.id} className="space-y-3">
              <ListingCard listing={listing} />
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-600 shadow-soft">
                <span>{listing.view_count ?? 0} pregleda</span>
                <span>{listing.favorite_count ?? 0} omiljenih</span>
                <span>{listing.message_count ?? 0} poruka</span>
              </div>
              {listing.status === "active" ? (
                <FeatureRequestPanel listing={listing} packages={packages.data} requests={requests.data} />
              ) : null}
              <OwnerListingActions listingId={listing.id} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Još nemate postavljenih oglasa"
            copy="Postavite prvi oglas i pronađite kupca među ribolovcima."
            action={{ href: "/postavi-oglas", label: "Postavi oglas" }}
          />
        </div>
      )}
      {requests.data.length ? (
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Zahtevi za promocije</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {requests.data.map((request) => (
              <div key={request.id} className="py-3 text-sm">
                <p className="font-bold">{request.listing?.title ?? request.listing_id}</p>
                <p className="mt-1 text-slate-600">
                  {request.type_label} · {request.package_days ? `${request.package_days} dana · ` : ""}
                  {formatPrice(request.price_amount, request.currency)} · {request.status} ·{" "}
                  {formatDate(request.created_at)}
                </p>
                <p className="mt-1 text-slate-600">Poziv na broj: {request.payment_reference}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
