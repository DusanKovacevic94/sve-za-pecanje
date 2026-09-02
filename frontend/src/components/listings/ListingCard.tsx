import Image from "next/image";
import Link from "next/link";

import {
  CameraIcon,
  LocationIcon,
  StoreIcon,
} from "@/components/icons";
import type { ListingCard as ListingCardType } from "@/lib/api";
import {
  conditionLabels,
  formatListingPrice,
  formatRelativeDate,
  listingStatusLabels,
} from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { FavoriteIconButton } from "@/components/listings/ListingActions";
import { Metadata, SectionHeading } from "@/components/ui/Primitives";
import { TrustIndicators } from "@/components/trust/TrustIndicators";

export function ListingCard({ listing }: { listing: ListingCardType }) {
  const visibleAttributes = listing.key_attributes.slice(0, 2);
  const sellerName = listing.seller.shop_active
    ? listing.seller.shop_name ?? listing.seller.display_name ?? listing.seller.username
    : listing.seller.display_name ?? listing.seller.username;
  const sellerHref = listing.seller.shop_active && listing.seller.shop_slug
    ? `/prodavnice/${listing.seller.shop_slug}`
    : `/prodavci/${listing.seller.username}`;
  const statusTone = listing.status === "reserved"
    ? "warn"
    : listing.status === "sold"
      ? "sold"
      : listing.status === "rejected"
        ? "danger"
        : "neutral";
  const statusLabel = listing.status === "active"
    ? null
    : listingStatusLabels[listing.status] ?? listing.status;

  return (
    <article
      data-listing-card
      data-listing-state={listing.status}
      className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-white shadow-soft hover:shadow-lift motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 ${
        listing.is_featured ? "border-reed-300 ring-1 ring-reed-100" : "border-sand-200 hover:border-river-200"
      }`}
    >
      <Link href={`/oglasi/${listing.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-river-50 via-white to-reed-50">
          {listing.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm font-semibold text-river-700">
              <CameraIcon size={32} />
              Bez fotografije
            </div>
          )}
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2" data-listing-statuses>
            {statusLabel ? <Badge tone={statusTone}>{statusLabel}</Badge> : null}
            {listing.is_featured ? <Badge tone="accent">Istaknuto</Badge> : null}
          </div>
        </div>
      </Link>
      <div className="flex min-h-64 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1" data-listing-primary>
            <SectionHeading as="h3" level="card">
              <Link
                href={`/oglasi/${listing.slug}`}
                className="line-clamp-2 min-h-12 leading-6 hover:text-river-700"
                data-listing-title
              >
                {listing.title}
              </Link>
            </SectionHeading>
            <p className="mt-1 truncate text-lg font-extrabold text-river-800" data-listing-price>
              {formatListingPrice(listing.price_type, listing.price_amount, listing.currency)}
              {listing.price_type === "negotiable" ? (
                <span className="ml-2 text-xs font-semibold text-ink-500">Po dogovoru</span>
              ) : null}
            </p>
          </div>
          <FavoriteIconButton listingId={listing.id} initialSaved={listing.is_favorited} />
        </div>

        <div
          className="mt-3 grid min-h-10 grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 text-xs font-semibold text-ink-600"
          data-listing-meta="facts"
          aria-label="Osnovni podaci oglasa"
        >
          <span className="inline-flex min-w-0 items-center gap-1" data-listing-location>
            <LocationIcon size={14} className="shrink-0" />
            <span className="truncate">{listing.city}</span>
          </span>
          <span className="max-w-40 truncate text-right" data-listing-condition>
            {conditionLabels[listing.condition] ?? listing.condition}
          </span>
          <span className="col-span-2 truncate text-ink-500">{listing.category.name_sr}</span>
        </div>

        <div
          className={`mt-3 grid min-h-9 gap-2 ${visibleAttributes.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          data-listing-meta={visibleAttributes.length ? "attributes" : undefined}
          aria-label={visibleAttributes.length ? "Najvažniji detalji opreme" : undefined}
          aria-hidden={visibleAttributes.length ? undefined : true}
        >
          {visibleAttributes.map((attribute) => {
            const text = `${attribute.label_sr}: ${attribute.value}${attribute.unit ? ` ${attribute.unit}` : ""}`;
            return (
              <span
                key={attribute.key}
                className="truncate rounded-xl bg-sand-50 px-2.5 py-2 text-xs font-semibold text-ink-700"
                title={text}
              >
                {attribute.label_sr}: {attribute.value}
                {attribute.unit ? ` ${attribute.unit}` : ""}
              </span>
            );
          })}
        </div>

        <Metadata
          as="div"
          className="mt-auto flex min-h-9 min-w-0 items-center justify-between gap-2 border-t border-sand-200 pt-3"
          data-listing-meta="seller"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {listing.seller.shop_active ? <StoreIcon size={14} className="shrink-0 text-river-700" /> : null}
            <Link href={sellerHref} className="truncate text-river-700 hover:text-river-600">
              {sellerName}
            </Link>
            {listing.seller.trust ? (
              <TrustIndicators trust={listing.seller.trust} variant="compact" />
            ) : null}
          </div>
          <time dateTime={listing.created_at} className="shrink-0">
            {formatRelativeDate(listing.created_at)}
          </time>
        </Metadata>
      </div>
    </article>
  );
}
