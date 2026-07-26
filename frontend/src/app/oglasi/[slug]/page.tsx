import Link from "next/link";
import { Eye, Heart, MessageSquare, Pencil, ShieldCheck, Store } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FavoriteButton, ReportButton } from "@/components/listings/ListingActions";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingViewTracker } from "@/components/listings/ListingViewTracker";
import { ShareButton } from "@/components/listings/ShareButton";
import { TrustIndicators } from "@/components/trust/TrustIndicators";
import { ApiError, apiFetch, ListingCard as ListingCardType, ListingDetail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  conditionLabels,
  deliveryMethodLabels,
  formatDate,
  formatListingPrice,
  priceTypeLabels
} from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function absoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://svezapecanje.rs";
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await apiFetch<ListingDetail>(`/listings/${slug}`, { cache: "no-store" }).catch(() => null);
  if (!listing) return { title: "Oglas nije pronađen | Sve Za Pecanje" };
  const image = listing.data.images.find((item) => item.is_cover)?.url ?? listing.data.cover_image_url ?? undefined;
  return {
    title: `${listing.data.title} — ${listing.data.category.name_sr} | Sve Za Pecanje`,
    description: `${listing.data.title}, ${conditionLabels[listing.data.condition]}, ${listing.data.city}, ${formatListingPrice(listing.data.price_type, listing.data.price_amount, listing.data.currency)}.`,
    alternates: {
      canonical: `/oglasi/${listing.data.slug}`
    },
    openGraph: {
      title: listing.data.title,
      description: `${conditionLabels[listing.data.condition]}, ${listing.data.city}, ${formatListingPrice(listing.data.price_type, listing.data.price_amount, listing.data.currency)}.`,
      type: "article",
      url: `/oglasi/${listing.data.slug}`,
      images: image ? [{ url: image, alt: listing.data.title }] : undefined
    }
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [response, user] = await Promise.all([
    apiFetch<ListingDetail>(`/listings/${slug}`, { cache: "no-store" }).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getCurrentUser()
  ]);
  const listing = response.data;
  const similar = await apiFetch<ListingCardType[]>(`/listings/${listing.id}/similar`, { next: { revalidate: 120 } }).catch(() => ({
    data: [] as ListingCardType[]
  }));
  const isOwner = user?.id === listing.seller.id;
  const sellerName = listing.seller.display_name ?? listing.seller.username;
  const initials = sellerName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const offer = listing.price_type === "on_request" ? undefined : {
    "@type": "Offer",
    price: listing.price_type === "free" ? 0 : listing.price_amount,
    priceCurrency: listing.currency,
    availability: listing.status === "sold"
      ? "https://schema.org/SoldOut"
      : listing.status === "reserved"
        ? "https://schema.org/LimitedAvailability"
        : "https://schema.org/InStock",
    itemCondition: listing.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    areaServed: listing.city,
    url: absoluteUrl(`/oglasi/${listing.slug}`)
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: listing.images.map((image) => absoluteUrl(image.url)),
    category: listing.category.name_sr,
    brand: listing.brand?.name ?? listing.brand_name_custom,
    offers: offer,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Tip cene",
        value: priceTypeLabels[listing.price_type]
      },
      ...listing.delivery_methods.map((method) => ({
        "@type": "PropertyValue",
        name: "Preuzimanje i dostava",
        value: deliveryMethodLabels[method] ?? method
      }))
    ]
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Početna", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Oglasi", item: absoluteUrl("/oglasi") },
      {
        "@type": "ListItem",
        position: 3,
        name: listing.category.name_sr,
        item: absoluteUrl(`/oglasi?category=${listing.category.slug}`)
      },
      { "@type": "ListItem", position: 4, name: listing.title, item: absoluteUrl(`/oglasi/${listing.slug}`) }
    ]
  };
  const metaRows = [
    ["Stanje", conditionLabels[listing.condition] ?? listing.condition],
    ["Lokacija", listing.municipality ? `${listing.city}, ${listing.municipality}` : listing.city],
    ["Brend", listing.brand?.name ?? listing.brand_name_custom],
    ["Model", listing.model],
    ["Tip cene", priceTypeLabels[listing.price_type]],
    ["Objavljeno", formatDate(listing.created_at)],
    ["Pregledi", String(listing.view_count)]
  ].filter(([, value]) => Boolean(value)) as [string, string][];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ListingViewTracker listingId={listing.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <nav aria-label="Putanja" className="mb-5 flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
        <Link href="/" className="hover:text-river-700">Početna</Link>
        <span>/</span>
        <Link href="/oglasi" className="hover:text-river-700">Oglasi</Link>
        <span>/</span>
        <Link href={`/oglasi?category=${listing.category.slug}`} className="hover:text-river-700">{listing.category.name_sr}</Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <ListingGallery listing={listing} />
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap gap-2">
            <Badge tone={listing.status === "sold" ? "sold" : listing.status === "reserved" ? "warn" : "accent"}>
              {listing.status === "sold" ? "Prodato" : listing.status === "reserved" ? "Rezervisano" : "Aktivan oglas"}
            </Badge>
            {listing.is_featured ? <Badge tone="accent">Istaknuto</Badge> : null}
            {listing.seller.shop_active ? <Badge>Prodavnica</Badge> : null}
            <Badge>{listing.category.name_sr}</Badge>
          </div>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-black">{listing.title}</h1>
              <p className="mt-3 text-3xl font-black text-river-800">
                {formatListingPrice(listing.price_type, listing.price_amount, listing.currency)}
              </p>
              {listing.price_type === "negotiable" ? (
                <p className="mt-1 text-sm font-semibold text-slate-600">Cena po dogovoru</p>
              ) : null}
            </div>
            <ShareButton title={listing.title} />
          </div>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {metaRows.map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {listing.attributes_display.length ? (
            <div className="mt-6">
              <h2 className="font-black">Detalji opreme</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {listing.attributes_display.map((attribute) => (
                  <div key={attribute.key} className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
                    <dt className="font-semibold text-slate-600">{attribute.label_sr}</dt>
                    <dd className="text-right">
                      {attribute.value}
                      {attribute.unit ? ` ${attribute.unit}` : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          {listing.delivery_methods.length || listing.delivery_note ? (
            <div className="mt-6">
              <h2 className="font-black">Preuzimanje i dostava</h2>
              {listing.delivery_methods.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {listing.delivery_methods.map((method) => (
                    <li key={method}><Badge>{deliveryMethodLabels[method] ?? method}</Badge></li>
                  ))}
                </ul>
              ) : null}
              {listing.delivery_note ? (
                <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{listing.delivery_note}</p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-6">
            <h2 className="font-black">Opis</h2>
            <p className="mt-3 whitespace-pre-line text-slate-700">{listing.description}</p>
          </div>
          </div>
        </section>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="font-black">Prodavac</h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-river-700 text-lg font-black text-white">
                {initials || "SZ"}
              </div>
              <div>
                <Link href={`/prodavci/${listing.seller.username}`} className="block text-lg font-black text-river-800 hover:text-river-600">
                  {sellerName}
                </Link>
                {listing.seller.shop_active && listing.seller.shop_slug ? (
                  <Link href={`/prodavnice/${listing.seller.shop_slug}`} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-river-700 hover:text-river-600">
                    <Store size={14} aria-hidden />
                    {listing.seller.shop_name}
                  </Link>
                ) : null}
                <p className="text-sm text-slate-600">{listing.city}</p>
              </div>
            </div>
            {listing.seller.trust ? (
              <TrustIndicators trust={listing.seller.trust} />
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <Eye className="text-river-700" size={17} />
                <p className="mt-1 font-black">{listing.view_count}</p>
                <p className="text-xs text-slate-500">pregleda</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <Heart className="text-river-700" size={17} />
                <p className="mt-1 font-black">{listing.seller.active_listing_count ?? 0}</p>
                <p className="text-xs text-slate-500">aktivnih oglasa</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {listing.status === "sold" ? (
                <p className="rounded-md bg-slate-100 p-3 text-sm font-semibold">Ovaj oglas je označen kao prodat.</p>
              ) : (
                <Button href={`/nalog/poruke?listing=${listing.id}`}><MessageSquare size={18} /> Pošalji poruku</Button>
              )}
              {isOwner ? (
                <Button href={`/izmeni-oglas/${listing.id}`} variant="secondary"><Pencil size={18} /> Izmeni oglas</Button>
              ) : (
                <>
                  <FavoriteButton listingId={listing.id} initialSaved={listing.is_favorited} />
                  <ReportButton listingId={listing.id} />
                </>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            <ShieldCheck size={20} />
            <p className="mt-2 font-semibold">Proverite opremu uživo i ne šaljite novac unapred nepoznatim prodavcima.</p>
          </div>
        </aside>
      </div>
      {similar.data.length ? (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black">Slični oglasi</h2>
            <Button href={`/oglasi?category=${listing.category.slug}`} variant="secondary">Još iz kategorije</Button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.data.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
