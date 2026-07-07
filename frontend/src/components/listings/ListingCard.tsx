import { Camera, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ListingCard as ListingCardType } from "@/lib/api";
import { conditionLabels, formatPrice, formatRelativeDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { FavoriteIconButton } from "@/components/listings/ListingActions";

export function ListingCard({ listing }: { listing: ListingCardType }) {
  return (
    <article
      className={`group overflow-hidden rounded-lg border bg-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        listing.is_featured ? "border-reed-300 ring-1 ring-reed-100" : "border-slate-200"
      }`}
    >
      <Link href={`/oglasi/${listing.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-river-50 via-white to-reed-100">
          {listing.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm font-semibold text-river-700">
              <Camera size={30} aria-hidden />
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
            <Link href={`/oglasi/${listing.slug}`} className="line-clamp-2 min-h-12 font-bold leading-6 hover:text-river-700">
              {listing.title}
            </Link>
            <p className="mt-1 text-lg font-black text-river-800">
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
          {listing.key_attributes.slice(0, 3).map((attribute) => (
            <Badge key={attribute.key}>
              {attribute.label_sr}: {attribute.value}
              {attribute.unit ? ` ${attribute.unit}` : ""}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {listing.seller.display_name ?? listing.seller.username} · {formatRelativeDate(listing.created_at)}
        </p>
      </div>
    </article>
  );
}
