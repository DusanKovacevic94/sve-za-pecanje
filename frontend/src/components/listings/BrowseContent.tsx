import Link from "next/link";

import { CloseIcon, FiltersIcon } from "@/components/icons";
import { MarketplaceSearchTracker } from "@/components/analytics/MarketplaceSearchTracker";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import {
  TrackedRecoveryContainer,
  TrackedRecoveryLink
} from "@/components/search/TrackedRecoveryLink";
import {
  apiFetch,
  Brand,
  Category,
  City,
  ListingCard as ListingCardType,
  SearchRecovery
} from "@/lib/api";
import {
  conditionLabels,
  deliveryMethodLabels,
  priceTypeLabels
} from "@/lib/format";

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

function values(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function hrefWithoutValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
  removedValue: string
) {
  const current = values(params[key]).filter((value) => value !== removedValue);
  const next = {
    ...params,
    [key]: current.length > 1 ? current : current[0],
    page: undefined
  };
  return `/oglasi?${toQuery(next)}`;
}

function activeFilters(
  params: Record<string, string | string[] | undefined>,
  categories: Category[],
  brands: Brand[]
) {
  const flattened = allCategories(categories);
  const categoryMap = new Map(flattened.map((category) => [category.slug, category.name_sr]));
  const chips: { id: string; key: string; label: string; href: string }[] = [];
  const add = (key: string, label: string) => chips.push({
    id: key,
    key,
    label,
    href: `/oglasi?${toQuery(params, { page: null }, [key])}`
  });
  if (typeof params.q === "string" && params.q) add("q", `Pretraga: ${params.q}`);
  values(params.category).forEach((slug) => {
    chips.push({
      id: `category-${slug}`,
      key: "category",
      label: categoryMap.get(slug) ?? slug,
      href: hrefWithoutValue(params, "category", slug)
    });
  });
  if (typeof params.price_min === "string" && params.price_min) add("price_min", `Od ${params.price_min}`);
  if (typeof params.price_max === "string" && params.price_max) add("price_max", `Do ${params.price_max}`);
  if (typeof params.currency === "string" && params.currency) add("currency", params.currency);
  values(params.price_type).forEach((priceType) => {
    chips.push({
      id: `price-type-${priceType}`,
      key: "price_type",
      label: priceTypeLabels[priceType] ?? priceType,
      href: hrefWithoutValue(params, "price_type", priceType)
    });
  });
  values(params.delivery_method).forEach((method) => {
    chips.push({
      id: `delivery-method-${method}`,
      key: "delivery_method",
      label: deliveryMethodLabels[method] ?? method,
      href: hrefWithoutValue(params, "delivery_method", method)
    });
  });
  if (typeof params.city === "string" && params.city) add("city", params.city);
  if (typeof params.condition === "string" && params.condition) add("condition", conditionLabels[params.condition] ?? params.condition);
  values(params.brand_id).forEach((brandId) => {
    chips.push({
      id: `brand-${brandId}`,
      key: "brand_id",
      label: brands.find((brand) => brand.id === brandId)?.name ?? "Izabrani brend",
      href: hrefWithoutValue(params, "brand_id", brandId)
    });
  });
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
  const selectedCategories = values(params.category)
    .map((slug) => flattened.find((item) => item.slug === slug))
    .filter((item): item is Category => Boolean(item));
  const rootIds = new Set(
    selectedCategories.map((item) => item.parent_id ?? item.id)
  );
  const selectedCategory = selectedCategories.length === 1
    ? selectedCategories[0]
    : rootIds.size === 1
      ? flattened.find((item) => item.id === [...rootIds][0])
      : undefined;
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

export async function BrowseContent({
  params,
  landing,
}: {
  params: Record<string, string | string[] | undefined>;
  landing?: { title: string; intro_copy: string };
}) {
  const selectedCategorySlugs = values(params.category);
  const brandParams = new URLSearchParams();
  selectedCategorySlugs.forEach((slug) => brandParams.append("category", slug));
  values(params.brand_id).forEach((id) => brandParams.append("include", id));
  const [categories, brands, cities, listings] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<Brand[]>(
      `/brands${brandParams.size ? `?${brandParams.toString()}` : ""}`,
      { next: { revalidate: 3600 } }
    ).catch(() => ({ data: [] })),
    apiFetch<City[]>("/categories/cities", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<ListingCardType[]>(`/listings?${toQuery(params)}`, { cache: "no-store" }).catch(() => ({
      data: [] as ListingCardType[],
      meta: { total: 0, page: 1, total_pages: 1 } as Record<string, unknown>
    }))
  ]);
  const total = Number(listings.meta?.total ?? listings.data.length);
  const page = Number(listings.meta?.page ?? 1);
  const totalPages = Number(listings.meta?.total_pages ?? 1);
  const chips = activeFilters(params, categories.data, brands.data);
  const recoveryParams = new URLSearchParams();
  if (typeof params.q === "string" && params.q) recoveryParams.set("q", params.q);
  selectedCategorySlugs.forEach((slug) => recoveryParams.append("category", slug));
  const recovery = total === 0
    ? await apiFetch<SearchRecovery>(
      `/search/recovery${recoveryParams.size ? `?${recoveryParams.toString()}` : ""}`,
      { cache: "no-store" }
    ).catch(() => ({
      data: {
        did_you_mean: [],
        related_categories: [],
        recent_listings: []
      } as SearchRecovery
    }))
    : null;
  const sort = typeof params.sort === "string" ? params.sort : "newest";
  const selectedCategories = allCategories(categories.data).filter((category) =>
    selectedCategorySlugs.includes(category.slug)
  );
  const analyticsCategoryId = selectedCategories.length === 1
    ? selectedCategories[0].id
    : null;
  const categoryChips = chips.filter((chip) => chip.key === "category");
  const heading = landing?.title ?? (categoryChips.length === 1
    ? `${categoryChips[0].label} oglasi`
    : categoryChips.length > 1
      ? `Oglasi u ${categoryChips.length} ${categoryChips.length < 5 ? "kategorije" : "kategorija"}`
      : "Oglasi za ribolovnu opremu");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <MarketplaceSearchTracker
        query={typeof params.q === "string" ? params.q : null}
        resultCount={total}
        filterCount={chips.length}
        page={page}
        categoryId={analyticsCategoryId}
      />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">{heading}</h1>
          {landing?.intro_copy ? (
            <p className="mt-3 max-w-3xl whitespace-pre-line text-slate-700">
              {landing.intro_copy}
            </p>
          ) : null}
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
          <FilterSidebar
            categories={categories.data}
            brands={brands.data}
            cities={cities.data}
            searchParams={params}
            idPrefix="desktop-filters"
          />
        </aside>
        <details className="lg:hidden">
          <summary className="focus-ring flex cursor-pointer items-center gap-2 rounded-md bg-white p-3 font-semibold shadow-soft">
            <FiltersIcon size={18} /> Filteri{chips.length ? ` (${chips.length})` : ""}
          </summary>
          <div className="mt-3">
            <FilterSidebar
              categories={categories.data}
              brands={brands.data}
              cities={cities.data}
              searchParams={params}
              idPrefix="mobile-filters"
            />
          </div>
        </details>
        <section>
          {chips.length ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Link key={chip.id} href={chip.href} rel="nofollow" className="focus-ring rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-soft hover:text-river-700">
                  {chip.label} <CloseIcon className="inline" size={14} />
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
                    <Button href={`/oglasi?${toQuery(params, { page: String(page - 1) })}`} rel="nofollow" variant="secondary">
                      Prethodna
                    </Button>
                  ) : null}
                  {pageNumbers(page, totalPages).map((pageNumber, index, pages) => (
                    <span key={pageNumber} className="contents">
                      {index > 0 && pageNumber - pages[index - 1] > 1 ? <span className="px-1 text-slate-500">...</span> : null}
                      <Button
                        href={`/oglasi?${toQuery(params, { page: String(pageNumber) })}`}
                        rel="nofollow"
                        variant={pageNumber === page ? "primary" : "secondary"}
                        className="h-11 w-11 px-0"
                      >
                        {pageNumber}
                      </Button>
                    </span>
                  ))}
                  {page < totalPages ? (
                    <Button href={`/oglasi?${toQuery(params, { page: String(page + 1) })}`} rel="nofollow" variant="secondary">
                      Sledeća
                    </Button>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
                <h2 className="text-2xl font-black">Nema oglasa za izabranu pretragu</h2>
                <p className="mt-2 text-slate-600">
                  Nijedan filter nije automatski uklonjen. Izaberite samo promenu koja vam odgovara.
                </p>
                {recovery?.data.did_you_mean.length ? (
                  <div className="mt-5">
                    <h3 className="font-black">Da li ste mislili?</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recovery.data.did_you_mean.map((suggestion) => (
                        <TrackedRecoveryLink
                          key={suggestion.id}
                          href={`/oglasi?${toQuery(params, { q: suggestion.value, page: null })}`}
                          action="spelling"
                          className="focus-ring rounded-md bg-river-50 px-3 py-2 text-sm font-bold text-river-800 hover:bg-river-100"
                        >
                          {suggestion.display}
                        </TrackedRecoveryLink>
                      ))}
                    </div>
                  </div>
                ) : null}
                {chips.length ? (
                  <div className="mt-5">
                    <h3 className="font-black">Uklonite samo jedan filter</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {chips.slice(0, 6).map((chip) => (
                        <TrackedRecoveryLink
                          key={chip.id}
                          href={chip.href}
                          action="remove_filter"
                          removedFilter={chip.key}
                          className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-river-300 hover:text-river-700"
                        >
                          Ukloni: {chip.label}
                        </TrackedRecoveryLink>
                      ))}
                    </div>
                  </div>
                ) : null}
                {recovery?.data.related_categories.length ? (
                  <div className="mt-5">
                    <h3 className="font-black">Srodne kategorije</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recovery.data.related_categories.map((category) => (
                        <TrackedRecoveryLink
                          key={category.id}
                          href={`/oglasi?${toQuery(
                            params,
                            { category: category.slug, page: null },
                            ["category"]
                          )}`}
                          action="related_category"
                          className="focus-ring rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:text-river-700"
                        >
                          {category.name_sr}
                        </TrackedRecoveryLink>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <TrackedRecoveryLink
                    href={`/nalog/sacuvane-pretrage?${toQuery(params)}`}
                    action="save_search"
                    className="focus-ring rounded-md bg-river-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-river-600"
                  >
                    Sačuvaj ovu pretragu
                  </TrackedRecoveryLink>
                  <Button href="/oglasi" variant="secondary">Pogledaj sve oglase</Button>
                </div>
              </div>
              {recovery?.data.recent_listings.length ? (
                <section>
                  <h2 className="text-xl font-black">Nedavno objavljeni srodni oglasi</h2>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {recovery.data.recent_listings.map((listing) => (
                      <TrackedRecoveryContainer key={listing.id} action="recent_listing">
                        <ListingCard listing={listing} />
                      </TrackedRecoveryContainer>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
