import { ListingCard } from "@/components/listings/ListingCard";
import { apiFetch, ListingCard as ListingCardType } from "@/lib/api";

export default async function AdminListingsPage() {
  const listings = await apiFetch<ListingCardType[]>("/admin/listings").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Moderacija oglasa</h1>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {listings.data.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
      </div>
    </div>
  );
}

