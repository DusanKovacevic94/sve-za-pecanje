import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/Button";
import { apiFetch, ListingCard as ListingCardType } from "@/lib/api";

export default async function MyListingsPage() {
  const listings = await apiFetch<ListingCardType[]>("/users/me/listings").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Moji oglasi</h1>
        <Button href="/postavi-oglas">Postavi oglas</Button>
      </div>
      {listings.data.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {listings.data.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-xl font-black">Još nemate postavljenih oglasa.</h2>
          <p className="mt-2 text-slate-600">Postavite prvi oglas i pronađite kupca među ribolovcima.</p>
        </div>
      )}
    </div>
  );
}

