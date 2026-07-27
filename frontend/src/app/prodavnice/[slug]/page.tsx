import Image from "next/image";
import { notFound } from "next/navigation";

import { ListingCard } from "@/components/listings/ListingCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FollowSellerButton } from "@/components/following/FollowSellerButton";
import { ApiError, apiFetch, type ShopDetail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { serverApiFetch } from "@/lib/server-api";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const shop = await apiFetch<ShopDetail>(`/shops/${slug}`, { next: { revalidate: 120 } }).catch(() => null);
  if (!shop) return { title: "Prodavnica nije pronađena | Sve Za Pecanje" };
  return {
    title: `${shop.data.shop_name} | Sve Za Pecanje`,
    description: shop.data.shop_description ?? `Oglasi prodavnice ${shop.data.shop_name} na Sve Za Pecanje.`
  };
}

export default async function ShopDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [response, user] = await Promise.all([
    serverApiFetch<ShopDetail>(`/shops/${slug}`).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getCurrentUser(),
  ]);
  const shop = response.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-river-700 text-2xl font-black text-white">
            {shop.shop_logo_url ? (
              <Image src={shop.shop_logo_url} alt={shop.shop_name ?? "Logo prodavnice"} fill sizes="80px" className="object-cover" />
            ) : (
              (shop.shop_name ?? "SZ").slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black">{shop.shop_name}</h1>
              <Badge>Prodavnica</Badge>
            </div>
            {shop.shop_description ? <p className="mt-2 max-w-3xl whitespace-pre-line text-slate-600">{shop.shop_description}</p> : null}
            <p className="mt-2 text-sm font-semibold text-slate-500">{shop.listings.length} aktivnih oglasa</p>
            {user?.id !== shop.user_id ? (
              <FollowSellerButton
                sellerId={shop.user_id}
                initialFollowing={shop.is_following}
                initialFollowerCount={shop.follower_count}
                className="mt-4 max-w-xs"
              />
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                {shop.follower_count} {shop.follower_count === 1 ? "pratilac" : "pratilaca"}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">Oglasi prodavnice</h2>
          <Button href="/prodavnice" variant="secondary">Sve prodavnice</Button>
        </div>
        {shop.listings.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shop.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-soft">Prodavnica trenutno nema aktivne oglase.</p>
        )}
      </section>
    </div>
  );
}
