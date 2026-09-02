import { notFound } from "next/navigation";

import { AddListingIcon, FollowedUserIcon } from "@/components/icons";
import { ListingCard } from "@/components/listings/ListingCard";
import { Badge } from "@/components/ui/Badge";
import {
  Divider,
  PageTitle,
  Panel,
  SectionHeading,
  SupportingCopy,
} from "@/components/ui/Primitives";
import { TrustIndicators } from "@/components/trust/TrustIndicators";
import { FollowSellerButton } from "@/components/following/FollowSellerButton";
import {
  ApiError,
  ListingCard as ListingCardType,
  type ReviewItem,
  type TrustSummary,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { serverApiFetch } from "@/lib/server-api";

type SellerProfile = {
  id: string;
  username: string;
  display_name: string | null;
  city: string | null;
  bio: string | null;
  fishing_styles: string[];
  active_listings_count: number;
  completed_sale_count: number;
  member_since: string;
  rating: number | null;
  trust: TrustSummary;
  reviews: ReviewItem[];
  listings: ListingCardType[];
  follower_count: number;
  is_following: boolean;
};

export default async function SellerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [response, user] = await Promise.all([
    serverApiFetch<SellerProfile>(`/users/profile/${username}`).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getCurrentUser(),
  ]);
  const profile = response.data;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Panel as="section" elevation="soft" className="p-6">
        <p className="text-sm font-semibold text-river-700">Prodavac</p>
        <PageTitle className="mt-2">{profile.display_name ?? profile.username}</PageTitle>
        <SupportingCopy className="mt-2">{profile.city ?? "Lokacija nije navedena"}</SupportingCopy>
        {user?.id !== profile.id ? (
          <FollowSellerButton
            sellerId={profile.id}
            initialFollowing={profile.is_following}
            initialFollowerCount={profile.follower_count}
            className="mt-5 max-w-xs"
          />
        ) : null}
        <TrustIndicators trust={profile.trust} className="mt-6" />
        <Divider className="my-6" />
        <section aria-labelledby="seller-activity-heading">
          <SectionHeading as="h2" level="card" id="seller-activity-heading">
            Aktivnost na platformi
          </SectionHeading>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2" data-seller-activity>
            <div className="flex items-center gap-2 rounded-xl border border-sand-200 p-3">
              <AddListingIcon size={18} className="text-river-700" aria-hidden />
              <div>
                <dt className="text-xs font-semibold text-ink-500">Aktivni oglasi</dt>
                <dd className="font-bold text-ink-800">{profile.active_listings_count}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-sand-200 p-3">
              <FollowedUserIcon size={18} className="text-river-700" aria-hidden />
              <div>
                <dt className="text-xs font-semibold text-ink-500">Pratioci</dt>
                <dd className="font-bold text-ink-800">{profile.follower_count}</dd>
              </div>
            </div>
          </dl>
        </section>
        {profile.bio ? <p className="mt-4 max-w-3xl text-ink-700">{profile.bio}</p> : null}
      </Panel>
      <SectionHeading className="mt-8">Ocene</SectionHeading>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {profile.reviews.length ? profile.reviews.slice(0, 6).map((review) => (
          <article key={review.id} className="rounded-xl border border-sand-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold">{review.listing?.title ?? "Oglas"}</h3>
                <p className="mt-1 text-sm text-ink-600">
                  {review.reviewer?.display_name ?? review.reviewer?.username ?? "Korisnik"} · {formatDate(review.created_at)}
                </p>
              </div>
              <Badge tone="accent">{review.rating}/5</Badge>
            </div>
            {review.comment ? <p className="mt-3 text-sm text-ink-700">{review.comment}</p> : null}
          </article>
        )) : (
          <div className="rounded-xl border border-sand-200 bg-white p-6 text-ink-600">Prodavac još nema ocene.</div>
        )}
      </div>
      <SectionHeading className="mt-8" id="aktivni-oglasi">Aktivni oglasi</SectionHeading>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {profile.listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
