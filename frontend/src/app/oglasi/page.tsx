import { SlidersHorizontal } from "lucide-react";

import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/Button";
import { apiFetch, Category, ListingCard as ListingCardType } from "@/lib/api";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toQuery(params: Record<string, string | string[] | undefined>, overrides: Record<string, string> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" && value) query.set(key, value);
  });
  Object.entries(overrides).forEach(([key, value]) => query.set(key, value));
  return query.toString();
}

export const metadata = {
  title: "Oglasi za ribolovnu opremu | Sve Za Pecanje"
};

export default async function BrowsePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [categories, listings] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<ListingCardType[]>(`/listings?${toQuery(params)}`, { next: { revalidate: 60 } }).catch(() => ({
      data: [] as ListingCardType[],
      meta: { total: 0, page: 1, total_pages: 1 } as Record<string, unknown>
    }))
  ]);
  const total = Number(listings.meta?.total ?? listings.data.length);
  const page = Number(listings.meta?.page ?? 1);
  const totalPages = Number(listings.meta?.total_pages ?? 1);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">Oglasi</h1>
          <p className="mt-2 text-slate-600">{total} rezultata za izabrane filtere</p>
        </div>
        <Button href={`/nalog/sacuvane-pretrage?${toQuery(params)}`} variant="secondary">
          Sačuvaj pretragu
        </Button>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <FilterSidebar categories={categories.data} searchParams={params} />
        </aside>
        <details className="lg:hidden">
          <summary className="focus-ring flex cursor-pointer items-center gap-2 rounded-md bg-white p-3 font-semibold shadow-soft">
            <SlidersHorizontal size={18} /> Filteri
          </summary>
          <div className="mt-3">
            <FilterSidebar categories={categories.data} searchParams={params} />
          </div>
        </details>
        <section>
          {listings.data.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.data.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav aria-label="Stranice" className="mt-8 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Button href={`/oglasi?${toQuery(params, { page: String(page - 1) })}`} variant="secondary">
                      Prethodna
                    </Button>
                  ) : null}
                  <span className="text-sm font-semibold text-slate-600">
                    Strana {page} od {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Button href={`/oglasi?${toQuery(params, { page: String(page + 1) })}`} variant="secondary">
                      Sledeća
                    </Button>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
              <h2 className="text-xl font-black">Nema oglasa za izabrane filtere.</h2>
              <p className="mt-2 text-slate-600">
                Pokušajte da proširite pretragu ili sačuvajte pretragu da vas obavestimo kada se pojavi novi oglas.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
