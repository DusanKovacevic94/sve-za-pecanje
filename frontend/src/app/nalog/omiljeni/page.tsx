import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ListingCard as ListingCardType } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export default function FavoritesPage() {
  return <FavoritesContent />;
}

async function FavoritesContent() {
  const favorites = await serverApiFetch<ListingCardType[]>("/users/me/favorites").catch(() => ({
    data: [],
  }));

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Omiljeni oglasi</h1>
      {favorites.data.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.data.map((listing) => (
            <ListingCard key={listing.id} listing={{ ...listing, is_favorited: true }} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Nemate omiljene oglase"
            copy="Sačuvajte oglase koje želite da pratite ili uporedite kasnije."
            action={{ href: "/oglasi", label: "Pregledaj oglase" }}
          />
        </div>
      )}
    </div>
  );
}
