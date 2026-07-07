import Link from "next/link";
import { Bell, CheckCircle2, Search, ShieldCheck, SlidersHorizontal, Star, Waves, type LucideIcon } from "lucide-react";

import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { Button } from "@/components/ui/Button";
import { ListingCard } from "@/components/listings/ListingCard";
import { apiFetch, Category, ListingCard as ListingCardType } from "@/lib/api";

async function getHomeData() {
  const [categories, listings] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<ListingCardType[]>("/listings?page_size=12", { next: { revalidate: 60 } }).catch(() => ({ data: [] }))
  ]);
  return { categories: categories.data, listings: listings.data };
}

export default async function HomePage() {
  const { categories, listings } = await getHomeData();
  const featuredListings = listings.filter((listing) => listing.is_featured).slice(0, 4);
  const latestListings = listings.filter((listing) => !listing.is_featured).slice(0, 8);
  const visibleLatest = latestListings.length ? latestListings : listings.slice(0, 8);
  const popularSearches = ["Shimano", "Daiwa", "feeder štap", "varalice", "mašinica 4000", "najlon 0.25"];
  const benefits: { Icon: LucideIcon; title: string; copy: string }[] = [
    { Icon: SlidersHorizontal, title: "Filteri za ribolovnu opremu", copy: "Dužina, težina bacanja, veličina mašinice i drugi detalji." },
    { Icon: ShieldCheck, title: "Oglasi od ribolovaca", copy: "Profil prodavca, prijave i ručna moderacija." },
    { Icon: Bell, title: "Sačuvane pretrage", copy: "Prati opremu koja te zanima bez ponavljanja filtera." },
    { Icon: Star, title: "Ocene prodavaca", copy: "Povratne informacije nakon prodaje grade poverenje." }
  ];
  return (
    <>
      <section className="overflow-hidden bg-[linear-gradient(135deg,#0f352f_0%,#147d6b_58%,#dca542_150%)] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-14">
          <div className="self-center">
            <h1 className="max-w-3xl text-4xl font-black tracking-normal md:text-5xl">
              Sve Za Pecanje
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-semibold text-river-50">
              Pronađi štapove, mašinice, varalice i opremu od ribolovaca iz Srbije.
            </p>
            <form action="/oglasi" className="mt-8 flex max-w-2xl flex-col gap-3 rounded-lg bg-white p-2 shadow-lift sm:flex-row">
              <label className="sr-only" htmlFor="q">Pretraga</label>
              <input
                id="q"
                name="q"
                className="focus-ring min-h-12 flex-1 rounded-md px-4 text-ink"
                placeholder="Pretraži Shimano, Daiwa, feeder..."
              />
              <Button type="submit" className="bg-ink hover:bg-ink-800">
                <Search size={18} /> Pretraži oglase
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {popularSearches.map((term) => (
                <Link
                  key={term}
                  href={`/oglasi?q=${encodeURIComponent(term)}`}
                  className="focus-ring rounded-md bg-white/12 px-3 py-2 text-sm font-semibold text-river-50 transition hover:bg-white/20"
                >
                  {term}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="/postavi-oglas" variant="secondary">Postavi oglas</Button>
              <Button href="/oglasi" variant="ghost" className="text-white hover:bg-white/10">Pogledaj oglase</Button>
            </div>
          </div>
          <div className="relative min-h-[300px] self-end">
            <div className="absolute inset-x-0 bottom-0 h-28 rounded-[50%] bg-white/10 blur-2xl" />
            <div className="absolute inset-x-8 bottom-8 h-1 rounded-full bg-reed-300/90" />
            <Waves className="absolute bottom-10 left-8 text-river-100/80" size={180} strokeWidth={1.2} />
            <div className="absolute right-8 top-0 grid h-36 w-36 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
              <CategoryIcon slug="stapovi" name="Štapovi" size={68} />
            </div>
            <div className="absolute bottom-16 right-28 grid h-28 w-28 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
              <CategoryIcon slug="masinice" name="Mašinice" size={52} />
            </div>
            <div className="absolute bottom-24 left-20 grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
              <CategoryIcon slug="varalice" name="Varalice" size={44} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Kategorije</h2>
            <p className="mt-1 text-sm text-slate-600">Brzo uđi u delove tržišta koje ribolovci najčešće pretražuju.</p>
          </div>
          <Button href="/kategorije" variant="secondary">Sve kategorije</Button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((category) => (
            <Link key={category.id} href={`/oglasi?category=${category.slug}`} className="surface p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-river-50 text-river-700">
                <CategoryIcon slug={category.slug} name={category.name_sr} />
              </div>
              <h3 className="mt-4 font-black">{category.name_sr}</h3>
              <p className="mt-1 text-sm text-slate-600">{category.active_count ?? 0} aktivnih oglasa</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white/75">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 md:grid-cols-4">
          {benefits.map(({ Icon, title, copy }) => (
            <div key={title} className="rounded-lg border border-sand-200 bg-white p-5">
              <Icon className="text-river-700" size={24} />
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        {featuredListings.length ? (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black">Istaknuti oglasi</h2>
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
          <h2 className="text-2xl font-black">Najnoviji oglasi</h2>
          <Button href="/oglasi" variant="secondary">Svi oglasi</Button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visibleLatest.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-amber-800" size={22} />
            <div>
              <h2 className="font-black text-amber-950">Kupuj bezbedno</h2>
              <p className="mt-2 text-sm leading-6 text-amber-950">
                Proverite opremu uživo kada god je moguće, ne šaljite novac unapred nepoznatim prodavcima i prijavite sumnjive oglase administratorima.
              </p>
              <Link href="/saveti-za-bezbednost" className="mt-3 inline-flex text-sm font-black text-amber-950 underline decoration-amber-400 underline-offset-4">
                Pogledaj savete za bezbednost
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
