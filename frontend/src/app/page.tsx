import Link from "next/link";

import { BrandWaterline } from "@/components/brand/BrandWaterline";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import {
  BellIcon,
  FiltersIcon,
  RatingIcon,
  SearchIcon,
  SuccessIcon,
  TrustShieldIcon,
  type IconComponent,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Panel, SectionHeading, SupportingCopy } from "@/components/ui/Primitives";
import { ListingCard } from "@/components/listings/ListingCard";
import { SearchCombobox } from "@/components/search/SearchCombobox";
import {
  apiFetch,
  Category,
  ListingCard as ListingCardType,
  SearchSuggestion
} from "@/lib/api";
import { formatListingPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const curatedSearchFallback: SearchSuggestion[] = [
  "Shimano",
  "Daiwa",
  "feeder štap",
  "varalice",
  "mašinica 4000",
  "najlon 0.25"
].map((term) => ({
  id: `query:fallback-${term}`,
  type: "common_query",
  display: term,
  value: term,
  href: `/oglasi?q=${encodeURIComponent(term)}`,
  description: "Predložena pretraga",
  source: "curated"
}));

async function getHomeData() {
  const [categories, listings, homepageListings, popularSearches] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<ListingCardType[]>("/listings?page_size=12", { next: { revalidate: 60 } }).catch(() => ({
      data: [] as ListingCardType[],
      meta: { total: 0 },
    })),
    apiFetch<ListingCardType[]>("/promotions/homepage-listings", { next: { revalidate: 60 } }).catch(() => ({
      data: [] as ListingCardType[]
    })),
    apiFetch<SearchSuggestion[]>("/search/popular?limit=6", {
      cache: "no-store"
    }).catch(() => ({ data: curatedSearchFallback }))
  ]);
  return {
    categories: categories.data,
    listings: listings.data,
    listingTotal: Number(listings.meta?.total ?? listings.data.length),
    homepageListings: homepageListings.data,
    popularSearches: popularSearches.data
  };
}

export default async function HomePage() {
  const { categories, listings, listingTotal, homepageListings, popularSearches } = await getHomeData();
  const featuredListings = (homepageListings.length ? homepageListings : listings.filter((listing) => listing.is_featured)).slice(0, 4);
  const latestListings = listings.filter((listing) => !listing.is_featured).slice(0, 8);
  const visibleLatest = latestListings.length ? latestListings : listings.slice(0, 8);
  const proofListings = (homepageListings.length ? homepageListings : listings).slice(0, 3);
  const activeCategoryCount = categories.filter((category) => category.active_count > 0).length;
  const benefits: { Icon: IconComponent; title: string; copy: string }[] = [
    { Icon: FiltersIcon, title: "Filteri za ribolovnu opremu", copy: "Dužina, težina bacanja, veličina mašinice i drugi detalji." },
    { Icon: TrustShieldIcon, title: "Oglasi od ribolovaca", copy: "Profil prodavca, prijave i ručna moderacija." },
    { Icon: BellIcon, title: "Sačuvane pretrage", copy: "Prati opremu koja te zanima bez ponavljanja filtera." },
    { Icon: RatingIcon, title: "Ocene prodavaca", copy: "Povratne informacije nakon prodaje grade poverenje." }
  ];
  return (
    <>
      <section className="relative isolate overflow-hidden bg-river-800 text-white" data-home-hero>
        <div className="absolute inset-0 -z-10 bg-hero-glow" aria-hidden="true" />
        <BrandWaterline className="pointer-events-none absolute -bottom-5 -right-24 -z-10 w-[52rem] text-reed-500 opacity-30" />
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
            <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-reed-300">
              Specijalizovani oglasi za ribolovce
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Pronađi pravu ribolovnu opremu
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-river-50 sm:text-xl">
              Pretraži štapove, mašinice, varalice i drugu opremu uz detalje koji su ribolovcima važni.
            </p>
            <form action="/oglasi" className="mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/20 bg-white p-2 shadow-lift sm:flex-row">
              <label className="sr-only" htmlFor="homepage-search">Pretraga</label>
              <SearchCombobox
                id="homepage-search"
                className="focus-ring min-h-12 w-full rounded-xl px-4 text-ink"
                placeholder="Pretraži Shimano, Daiwa, feeder..."
              />
              <Button type="submit" className="bg-ink hover:bg-ink-800">
                <SearchIcon size={18} /> Pretraži oglase
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {popularSearches.map((suggestion) => (
                <Link
                  key={suggestion.id}
                  href={suggestion.href}
                  className="focus-ring rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-semibold text-river-50 hover:border-reed-300 hover:bg-white/10 motion-safe:transition-colors"
                >
                  {suggestion.display}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="/postavi-oglas" variant="secondary" className="flex-1 sm:flex-none">Postavi oglas</Button>
              <Button href="/oglasi" variant="ghost" className="flex-1 !text-white hover:!bg-white/10 sm:flex-none">Pogledaj oglase</Button>
            </div>
          </div>
            <aside
              className="rounded-2xl border border-white/20 bg-white p-5 text-ink shadow-lift"
              aria-label="Trenutno na tržištu"
              data-marketplace-proof
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-river-700">Trenutno na tržištu</p>
              {listingTotal > 0 || activeCategoryCount > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 border-b border-sand-200 pb-4">
                  <div>
                    <dt className="text-xs font-semibold text-ink-500">Aktivni oglasi</dt>
                    <dd className="mt-1 text-2xl font-extrabold text-river-800">{listingTotal}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-ink-500">Glavne kategorije</dt>
                    <dd className="mt-1 text-2xl font-extrabold text-river-800">{activeCategoryCount}</dd>
                  </div>
                </dl>
              ) : null}
              {proofListings.length ? (
                <div className="mt-4 space-y-2">
                  {proofListings.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/oglasi/${listing.slug}`}
                      className="focus-ring block rounded-xl border border-sand-200 p-3 hover:border-river-300"
                      data-marketplace-proof-listing
                    >
                      <span className="block truncate text-xs font-semibold text-ink-500">
                        {listing.category.name_sr} · {listing.city}
                      </span>
                      <span className="mt-1 block truncate text-sm font-bold text-ink-900">{listing.title}</span>
                      <span className="mt-1 block text-sm font-extrabold text-river-800">
                        {formatListingPrice(listing.price_type, listing.price_amount, listing.currency)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-sand-50 p-4">
                  <p className="font-bold text-ink-800">Počni preciznom pretragom</p>
                  <p className="mt-1 text-sm leading-6 text-ink-600">
                    Pretraži naziv opreme, brend ili tehnički detalj koji ti je važan.
                  </p>
                </div>
              )}
              <Link href="/oglasi" className="mt-4 inline-flex text-sm font-bold text-river-700 hover:text-river-600">
                Pogledaj sve oglase
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 h-1 w-9 rounded-full bg-reed-500" aria-hidden="true" />
            <SectionHeading>Kategorije</SectionHeading>
            <SupportingCopy className="mt-1">Brzo uđi u delove tržišta koje ribolovci najčešće pretražuju.</SupportingCopy>
          </div>
          <Button href="/kategorije" variant="secondary">Sve kategorije</Button>
        </div>
        {categories.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
            <Link key={category.id} href={`/kategorije/${category.slug}`} data-motion-card className="surface group p-5 hover:border-river-200 hover:shadow-lift motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-river-100 bg-river-50 text-river-700 group-hover:border-reed-200 group-hover:bg-reed-50 motion-safe:transition-colors">
                <CategoryIcon slug={category.slug} name={category.name_sr} />
              </div>
              <SectionHeading as="h3" level="card" className="mt-4">{category.name_sr}</SectionHeading>
              <SupportingCopy className="mt-1">{category.active_count ?? 0} aktivnih oglasa</SupportingCopy>
            </Link>
            ))}
          </div>
        ) : (
          <Panel className="mt-6 p-5">
            <SectionHeading as="h3" level="card">Pretraga je spremna</SectionHeading>
            <SupportingCopy className="mt-2">Unesi naziv opreme ili brenda da proveriš trenutno dostupne oglase.</SupportingCopy>
          </Panel>
        )}
      </section>

      <section className="border-y border-sand-200 bg-sand-50">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 md:grid-cols-4">
          {benefits.map(({ Icon, title, copy }) => (
            <Panel key={title} className="p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-river-50 text-river-700">
                <Icon size={22} />
              </div>
              <SectionHeading as="h3" level="card" className="mt-4">{title}</SectionHeading>
              <SupportingCopy className="mt-2">{copy}</SupportingCopy>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        {featuredListings.length ? (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-4">
              <SectionHeading>Istaknuti oglasi</SectionHeading>
              <Button href="/oglasi" variant="secondary">Svi oglasi</Button>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <SectionHeading>Najnoviji oglasi</SectionHeading>
          <Button href="/oglasi" variant="secondary">Svi oglasi</Button>
        </div>
        {visibleLatest.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleLatest.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <Panel className="mt-6 p-6">
            <SectionHeading as="h3" level="card">Još nema aktivnih oglasa</SectionHeading>
            <SupportingCopy className="mt-2">Postavi opremu koju više ne koristiš i pokreni ponudu za druge ribolovce.</SupportingCopy>
            <Button href="/postavi-oglas" className="mt-4">Postavi prvi oglas</Button>
          </Panel>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-xl border border-reed-200 bg-reed-50 p-5">
          <div className="flex items-start gap-3">
            <SuccessIcon className="mt-0.5 shrink-0 text-reed-800" size={22} />
            <div>
              <h2 className="font-extrabold text-reed-900">Kupuj bezbedno</h2>
              <p className="mt-2 text-sm leading-6 text-reed-900">
                Proverite opremu uživo kada god je moguće, ne šaljite novac unapred nepoznatim prodavcima i prijavite sumnjive oglase administratorima.
              </p>
              <Link href="/saveti-za-bezbednost" className="mt-3 inline-flex text-sm font-extrabold text-reed-900 underline decoration-reed-400 underline-offset-4">
                Pogledaj savete za bezbednost
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
