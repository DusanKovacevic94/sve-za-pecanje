import { notFound } from "next/navigation";

import { ListingCard } from "@/components/listings/ListingCard";
import { Badge } from "@/components/ui/Badge";
import { ApiError, apiFetch, ListingCard as ListingCardType, type ReviewItem } from "@/lib/api";
import { formatDate } from "@/lib/format";

type SellerProfile = {
  username: string;
  display_name: string | null;
  city: string | null;
  bio: string | null;
  fishing_styles: string[];
  active_listings_count: number;
  rating: number | null;
  reviews: ReviewItem[];
  listings: ListingCardType[];
};

export default async function SellerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const response = await apiFetch<SellerProfile>(`/users/profile/${username}`).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const profile = response.data;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold text-river-700">Prodavac</p>
        <h1 className="mt-2 text-3xl font-black">{profile.display_name ?? profile.username}</h1>
        <p className="mt-2 text-slate-600">{profile.city ?? "Lokacija nije navedena"}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <span>Aktivni oglasi: {profile.active_listings_count}</span>
          <span>Ocena: {profile.rating ? profile.rating.toFixed(1) : "Još nema ocena"}</span>
        </div>
        {profile.bio ? <p className="mt-4 max-w-3xl text-slate-700">{profile.bio}</p> : null}
      </section>
      <h2 className="mt-8 text-2xl font-black">Ocene</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {profile.reviews.length ? profile.reviews.slice(0, 6).map((review) => (
          <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{review.listing?.title ?? "Oglas"}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {review.reviewer?.display_name ?? review.reviewer?.username ?? "Korisnik"} · {formatDate(review.created_at)}
                </p>
              </div>
              <Badge tone="accent">{review.rating}/5</Badge>
            </div>
            {review.comment ? <p className="mt-3 text-sm text-slate-700">{review.comment}</p> : null}
          </article>
        )) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">Prodavac još nema ocene.</div>
        )}
      </div>
      <h2 className="mt-8 text-2xl font-black">Aktivni oglasi</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {profile.listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
