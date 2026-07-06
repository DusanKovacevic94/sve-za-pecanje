import { FeatureListingManager } from "@/components/admin/FeatureListingManager";
import { type ListingCard } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export default async function FeaturedAdminPage() {
  const listings = await serverApiFetch<ListingCard[]>("/admin/listings?status=active").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black">Istaknuto</h1>
      <p className="mt-2 text-slate-600">Postavite rok do kog se aktivni oglas prikazuje kao istaknut.</p>
      <div className="mt-6">
        <FeatureListingManager listings={listings.data} />
      </div>
    </div>
  );
}
