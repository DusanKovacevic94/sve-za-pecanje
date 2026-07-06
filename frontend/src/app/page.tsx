import { Search, ShieldCheck, SlidersHorizontal, Star, Bell, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ListingCard } from "@/components/listings/ListingCard";
import { apiFetch, Category, ListingCard as ListingCardType } from "@/lib/api";

async function getHomeData() {
  const [categories, listings] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<ListingCardType[]>("/listings?page_size=8", { next: { revalidate: 60 } }).catch(() => ({ data: [] }))
  ]);
  return { categories: categories.data, listings: listings.data };
}

export default async function HomePage() {
  const { categories, listings } = await getHomeData();
  const benefits: { Icon: LucideIcon; title: string; copy: string }[] = [
    { Icon: SlidersHorizontal, title: "Filteri za ribolovnu opremu", copy: "Dužina, težina bacanja, veličina mašinice i drugi detalji." },
    { Icon: ShieldCheck, title: "Oglasi od ribolovaca", copy: "Profil prodavca, prijave i ručna moderacija." },
    { Icon: Bell, title: "Sačuvane pretrage", copy: "Prati opremu koja te zanima bez ponavljanja filtera." },
    { Icon: Star, title: "Ocene prodavaca", copy: "Povratne informacije nakon prodaje grade poverenje." }
  ];
  return (
    <>
      <section className="bg-[linear-gradient(135deg,#0f352f_0%,#147d6b_55%,#e4b363_160%)] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div className="self-center">
            <h1 className="max-w-3xl text-4xl font-black tracking-normal md:text-6xl">
              Polovna i nova oprema za ribolov na jednom mestu
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-river-50">
              Pronađi štapove, mašinice, varalice i opremu od ribolovaca iz Srbije.
            </p>
            <form action="/oglasi" className="mt-8 flex max-w-2xl flex-col gap-3 rounded-lg bg-white p-2 sm:flex-row">
              <label className="sr-only" htmlFor="q">Pretraga</label>
              <input
                id="q"
                name="q"
                className="focus-ring min-h-12 flex-1 rounded-md px-4 text-ink"
                placeholder="Pretraži Shimano, Daiwa, feeder..."
              />
              <Button type="submit" className="bg-ink hover:bg-slate-800">
                <Search size={18} /> Pretraži oglase
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button href="/postavi-oglas" variant="secondary">Postavi oglas</Button>
              <Button href="/oglasi" variant="ghost" className="text-white hover:bg-white/10">Pogledaj oglase</Button>
            </div>
          </div>
          <div className="grid gap-4 self-end sm:grid-cols-2">
            {categories.slice(0, 6).map((category) => (
              <a
                key={category.id}
                href={`/oglasi?category=${category.slug}`}
                className="focus-ring rounded-lg bg-white/12 p-4 backdrop-blur transition hover:bg-white/20"
              >
                <p className="text-lg font-black">{category.name_sr}</p>
                <p className="mt-2 text-sm text-river-50">Strukturirani filteri i jasni detalji.</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">Najnoviji oglasi</h2>
          <Button href="/oglasi" variant="secondary">Svi oglasi</Button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 md:grid-cols-4">
          {benefits.map(({ Icon, title, copy }) => (
            <div key={title} className="rounded-lg border border-slate-200 p-5">
              <Icon className="text-river-600" size={24} />
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-900">Kupuj bezbedno</h2>
          <p className="mt-2 text-sm text-amber-900">
            Proverite opremu uživo kada god je moguće, ne šaljite novac unapred nepoznatim prodavcima i prijavite sumnjive oglase administratorima.
          </p>
        </div>
      </section>
    </>
  );
}
