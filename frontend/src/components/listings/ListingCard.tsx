import { MapPin } from "lucide-react";
import Link from "next/link";

import type { ListingCard as ListingCardType } from "@/lib/api";
import { conditionLabels, formatDate, formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { FavoriteIconButton } from "@/components/listings/ListingActions";

export function ListingCard({ listing }: { listing: ListingCardType }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
      <Link href={`/oglasi/${listing.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-river-100 via-white to-reed/30">
          {listing.cover_image_url ? (
            <img
              src={listing.cover_image_url}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm font-semibold text-river-700">
              Fotografija opreme
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            {listing.is_featured ? <Badge tone="accent">Istaknuto</Badge> : null}
            {listing.status === "sold" ? <Badge tone="sold">Prodato</Badge> : null}
          </div>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/oglasi/${listing.slug}`} className="line-clamp-2 font-bold hover:text-river-700">
              {listing.title}
            </Link>
            <p className="mt-1 text-lg font-black text-river-700">
              {formatPrice(listing.price_amount, listing.currency)}
            </p>
          </div>
          <FavoriteIconButton listingId={listing.id} initialSaved={listing.is_favorited} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} /> {listing.city}
          </span>
          <span>{conditionLabels[listing.condition] ?? listing.condition}</span>
          <span>{listing.category.name_sr}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(listing.key_attributes).slice(0, 3).map(([key, value]) => (
            <Badge key={key}>{String(value)}</Badge>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {listing.seller.display_name ?? listing.seller.username} · {formatDate(listing.created_at)}
        </p>
      </div>
    </article>
  );
}
