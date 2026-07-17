import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { apiFetch, Brand, Category, City, ListingCard as ListingCardType } from "@/lib/api";
import { conditionLabels } from "@/lib/format";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const sortOptions = [
  { value: "newest", label: "Najnovije" },
  { value: "price_asc", label: "Cena rastuće" },
  { value: "price_desc", label: "Cena opadajuće" },
  { value: "most_viewed", label: "Najgledanije" }
];

function toQuery(
  params: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | null> = {},
  remove: string[] = []
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (remove.includes(key)) return;
    if (typeof value === "string" && value) query.set(key, value);
    if (Array.isArray(value)) value.filter(Boolean).forEach((item) => query.append(key, item));
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value) query.set(key, value);
    else query.delete(key);
  });
  return query.toString();
}

function allCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...allCategories(category.children)]);
}

function activeFilters(
  params: Record<string, string | string[] | undefined>,
  categories: Category[],
  brands: Brand[]
) {
  const flattened = allCategories(categories);
  const categoryMap = new Map(flattened.map((category) => [category.slug, category.name_sr]));
  const chips: { key: string; label: string; href: string }[] = [];
  const add = (key: string, label: string) => chips.push({ key, label, href: `/oglasi?${toQuery(params, { page: null }, [key])}` });
  if (typeof params.q === "string" && params.q) add("q", `Pretraga: ${params.q}`);
  if (typeof params.category === "string" && params.category) add("category", categoryMap.get(params.category) ?? params.category);
  if (typeof params.price_min === "string" && params.price_min) add("price_min", `Od ${params.price_min}`);
  if (typeof params.price_max === "string" && params.price_max) add("price_max", `Do ${params.price_max}`);
  if (typeof params.currency === "string" && params.currency) add("currency", params.currency);
  if (typeof params.city === "string" && params.city) add("city", params.city);
  if (typeof params.condition === "string" && params.condition) add("condition", conditionLabels[params.condition] ?? params.condition);
  if (typeof params.brand_id === "string" && params.brand_id) {
    add("brand_id", brands.find((brand) => brand.id === params.brand_id)?.name ?? "Izabrani brend");
  }
  if (params.with_images === "true") add("with_images", "Sa slikom");
  if (params.seller_type === "shop") add("seller_type", "Prodavnica");
  if (params.seller_type === "private") add("seller_type", "Privatni prodavac");
  const postedLabels: Record<string, string> = {
    "24h": "Poslednja 24 sata",
    "7d": "Poslednjih 7 dana",
    "30d": "Poslednjih 30 dana"
  };
  if (typeof params.posted_within === "string" && postedLabels[params.posted_within]) {
    add("posted_within", postedLabels[params.posted_within]);
  }
  const selectedCategory = flattened.find((item) => item.slug === params.category);
  Object.entries(params).forEach(([key, rawValue]) => {
    const match = /^attributes\[([^\]]+)\](?:\[(min|max)\])?$/.exec(key);
    if (!match || !rawValue) return;
    const attribute = selectedCategory?.attributes.find((item) => item.key === match[1]);
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    const optionLabels = new Map(
      attribute?.options.options?.map((option) => [option.value, option.label_sr]) ?? []
    );
    const valueLabel = values.map((value) => optionLabels.get(value) ?? (value === "true" ? "Da" : value === "false" ? "Ne" : value)).join(", ");
    const bound = match[2] === "min" ? "od" : match[2] === "max" ? "do" : "";
    add(key, `${attribute?.label_sr ?? match[1]}${bound ? ` ${bound}` : ""}: ${valueLabel}`);
  });
  return chips;
}

function pageNumbers(page: number, totalPages: number) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((item) => item >= 1 && item <= totalPages));
  return [...pages].sort((left, right) => left - right);
}

export const metadata = {
  title: "Oglasi za ribolovnu opremu | Sve Za Pecanje"
};

export default async function BrowsePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedCategorySlug = typeof params.category === "string" ? params.category : "";
  const [categories, brands, cities, listings] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<Brand[]>(
      `/brands${selectedCategorySlug ? `?category=${encodeURIComponent(selectedCategorySlug)}` : ""}`,
      { next: { revalidate: 3600 } }
    ).catch(() => ({ data: [] })),
    apiFetch<City[]>("/categories/cities", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<ListingCardType[]>(`/listings?${toQuery(params)}`, { next: { revalidate: 60 } }).catch(() => ({
      data: [] as ListingCardType[],
      meta: { total: 0, page: 1, total_pages: 1 } as Record<string, unknown>
    }))
  ]);
  const total = Number(listings.meta?.total ?? listings.data.length);
  const page = Number(listings.meta?.page ?? 1);
  const totalPages = Number(listings.meta?.total_pages ?? 1);
  const chips = activeFilters(params, categories.data, brands.data);
  const sort = typeof params.sort === "string" ? params.sort : "newest";
  const categoryLabel = typeof params.category === "string"
    ? chips.find((chip) => chip.key === "category")?.label
    : null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">{categoryLabel ? `${categoryLabel} oglasi` : "Oglasi za ribolovnu opremu"}</h1>
          <p className="mt-2 text-slate-600">{total} rezultata za izabrane filtere</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action="/oglasi" className="flex items-center gap-2">
            {Object.entries(params).flatMap(([key, value]) => {
              if (key === "sort" || key === "page") return [];
              const values = Array.isArray(value) ? value : value ? [value] : [];
              return values.map((item, index) => (
                <input key={`${key}-${index}`} type="hidden" name={key} value={item} />
              ));
            })}
            <Select name="sort" defaultValue={sort} aria-label="Sortiranje oglasa" className="min-w-44">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">Sortiraj</Button>
          </form>
          <Button href={`/nalog/sacuvane-pretrage?${toQuery(params)}`} variant="secondary">
            Sačuvaj pretragu
          </Button>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <FilterSidebar categories={categories.data} brands={brands.data} cities={cities.data} searchParams={params} />
        </aside>
        <details className="lg:hidden">
          <summary className="focus-ring flex cursor-pointer items-center gap-2 rounded-md bg-white p-3 font-semibold shadow-soft">
            <SlidersHorizontal size={18} /> Filteri{chips.length ? ` (${chips.length})` : ""}
          </summary>
          <div className="mt-3">
            <FilterSidebar categories={categories.data} brands={brands.data} cities={cities.data} searchParams={params} />
          </div>
        </details>
        <section>
          {chips.length ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Link key={chip.key} href={chip.href} className="focus-ring rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-soft hover:text-river-700">
                  {chip.label} ×
                </Link>
              ))}
              <Link href="/oglasi" className="focus-ring rounded-md px-3 py-2 text-sm font-semibold text-river-700 hover:bg-river-50">
                Poništi sve
              </Link>
            </div>
          ) : null}
          {listings.data.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.data.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav aria-label="Stranice" className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  {page > 1 ? (
                    <Button href={`/oglasi?${toQuery(params, { page: String(page - 1) })}`} variant="secondary">
                      Prethodna
                    </Button>
                  ) : null}
                  {pageNumbers(page, totalPages).map((pageNumber, index, pages) => (
                    <span key={pageNumber} className="contents">
                      {index > 0 && pageNumber - pages[index - 1] > 1 ? <span className="px-1 text-slate-500">...</span> : null}
                      <Button
                        href={`/oglasi?${toQuery(params, { page: String(pageNumber) })}`}
                        variant={pageNumber === page ? "primary" : "secondary"}
                        className="h-11 w-11 px-0"
                      >
                        {pageNumber}
                      </Button>
                    </span>
                  ))}
                  {page < totalPages ? (
                    <Button href={`/oglasi?${toQuery(params, { page: String(page + 1) })}`} variant="secondary">
                      Sledeća
                    </Button>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Nema oglasa za izabrane filtere"
              copy="Pokušajte da proširite pretragu ili sačuvajte pretragu da vas obavestimo kada se pojavi novi oglas."
              action={{ href: "/oglasi", label: "Poništi filtere" }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
