import { MessageSquare, Pencil, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FavoriteButton, ReportButton } from "@/components/listings/ListingActions";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingViewTracker } from "@/components/listings/ListingViewTracker";
import { ApiError, apiFetch, ListingDetail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { conditionLabels, formatDate, formatPrice } from "@/lib/format";

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
  const listing = await apiFetch<ListingDetail>(`/listings/${slug}`, { next: { revalidate: 60 } }).catch(() => null);
  if (!listing) return { title: "Oglas nije pronađen | Sve Za Pecanje" };
  const image = listing.data.images.find((item) => item.is_cover)?.url ?? listing.data.cover_image_url ?? undefined;
  return {
    title: `${listing.data.title} — ${listing.data.category.name_sr} | Sve Za Pecanje`,
    description: `${listing.data.title}, ${conditionLabels[listing.data.condition]}, ${listing.data.city}, ${formatPrice(listing.data.price_amount, listing.data.currency)}.`,
    alternates: {
      canonical: `/oglasi/${listing.data.slug}`
    },
    openGraph: {
      title: listing.data.title,
      description: `${conditionLabels[listing.data.condition]}, ${listing.data.city}, ${formatPrice(listing.data.price_amount, listing.data.currency)}.`,
      type: "article",
      url: `/oglasi/${listing.data.slug}`,
      images: image ? [{ url: image, alt: listing.data.title }] : undefined
    }
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [response, user] = await Promise.all([
    apiFetch<ListingDetail>(`/listings/${slug}`, { next: { revalidate: 60 } }).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getCurrentUser()
  ]);
  const listing = response.data;
  const isOwner = user?.id === listing.seller.id;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: listing.images.map((image) => absoluteUrl(image.url)),
    category: listing.category.name_sr,
    brand: listing.brand?.name ?? listing.brand_name_custom,
    offers: {
      "@type": "Offer",
      price: listing.price_amount,
      priceCurrency: listing.currency,
      availability: listing.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      itemCondition: listing.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      areaServed: listing.city,
      url: absoluteUrl(`/oglasi/${listing.slug}`)
    }
  };
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <ListingViewTracker listingId={listing.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section>
        <ListingGallery listing={listing} />
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap gap-2">
            <Badge tone={listing.status === "sold" ? "sold" : "accent"}>{listing.status === "sold" ? "Prodato" : "Aktivan oglas"}</Badge>
            {listing.is_featured ? <Badge tone="accent">Istaknuto</Badge> : null}
            <Badge>{listing.category.name_sr}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-black">{listing.title}</h1>
          <p className="mt-3 text-3xl font-black text-river-700">{formatPrice(listing.price_amount, listing.currency)}</p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Stanje", conditionLabels[listing.condition] ?? listing.condition],
              ["Lokacija", listing.municipality ? `${listing.city}, ${listing.municipality}` : listing.city],
              ["Brend", listing.brand?.name ?? listing.brand_name_custom ?? "Nije navedeno"],
              ["Model", listing.model ?? "Nije navedeno"],
              ["Objavljeno", formatDate(listing.created_at)],
              ["Pregledi", String(listing.view_count)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(listing.attributes).length ? (
            <div className="mt-6">
              <h2 className="font-black">Detalji opreme</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(listing.attributes).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
                    <dt className="font-semibold text-slate-600">{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <div className="mt-6">
            <h2 className="font-black">Opis</h2>
            <p className="mt-3 whitespace-pre-line text-slate-700">{listing.description}</p>
          </div>
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="font-black">Prodavac</h2>
          <a href={`/prodavci/${listing.seller.username}`} className="mt-2 block text-lg font-black text-river-700">
            {listing.seller.display_name ?? listing.seller.username}
          </a>
          <p className="mt-1 text-sm text-slate-600">{listing.city}</p>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <ShieldCheck size={20} />
          <p className="mt-2 font-semibold">Proverite opremu uživo i ne šaljite novac unapred nepoznatim prodavcima.</p>
        </div>
      </aside>
    </div>
  );
}
