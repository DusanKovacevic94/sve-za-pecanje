import { notFound } from "next/navigation";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandWaterline } from "@/components/brand/BrandWaterline";
import {
  BellIcon,
  FiltersIcon,
  LocationIcon,
  SearchIcon,
  TrustShieldIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";

export const metadata = {
  title: "Brand system | Sve Za Pecanje",
  robots: { index: false, follow: false },
};

const palette = [
  { name: "Pine", value: "#173F37", role: "Primary" },
  { name: "Orange", value: "#EE9835", role: "Accent" },
  { name: "Cream", value: "#F7F6F1", role: "Canvas" },
  { name: "Ink", value: "#16201D", role: "Text" },
  { name: "White", value: "#FFFFFF", role: "Surface" },
];

export default function BrandCatalogPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-reed-700">
          Visual identity
        </p>
        <h1 className="mt-2 text-4xl font-black text-ink">Sve Za Pecanje brand system</h1>
        <p className="mt-3 text-lg leading-8 text-slate-600">
          A minimal vector language built from the finished hook-and-ripple logo.
        </p>
      </div>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="surface flex min-h-44 items-center p-8">
          <BrandLogo className="h-auto w-full max-w-[490px]" />
        </div>
        <div className="relative flex min-h-44 items-center overflow-hidden rounded-xl bg-river-900 p-8">
          <BrandWaterline className="absolute -bottom-7 -right-20 w-[34rem] text-reed-500 opacity-20" />
          <BrandLogo variant="inverse" className="relative h-auto w-full max-w-[490px]" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-black">Core palette</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {palette.map((color) => (
            <article key={color.name} data-brand-swatch={color.name} className="surface overflow-hidden">
              <div className="h-24 border-b border-sand-200" style={{ backgroundColor: color.value }} />
              <div className="p-4">
                <p className="font-black">{color.name}</p>
                <p className="mt-1 font-mono text-xs uppercase text-slate-500">{color.value}</p>
                <p className="mt-2 text-sm text-slate-600">{color.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface p-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-reed-700">Typography</p>
          <p className="mt-4 text-4xl font-black tracking-tight text-ink">Jasno kao mirna voda.</p>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Manrope keeps marketplace information compact, readable, and practical across
            headings, prices, filters, and longer descriptions.
          </p>
          <p className="mt-5 text-sm font-semibold text-slate-500">
            0123456789 · ČĆŽŠĐ čćžšđ · 2.400 RSD
          </p>
        </div>
        <div className="relative min-h-64 overflow-hidden rounded-xl border border-river-700 bg-river-800 p-6 text-white">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-reed-300">SVG motif</p>
          <BrandWaterline data-brand-motif className="absolute bottom-6 left-0 w-[42rem] text-reed-400" />
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="surface p-6">
          <h2 className="text-xl font-black">Controls and states</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Quiet action</Button>
            <Button isLoading data-motion-loading>Čuvanje</Button>
          </div>
          <div className="mt-6 max-w-md space-y-2">
            <FieldLabel htmlFor="brand-example">Search field</FieldLabel>
            <Input id="brand-example" placeholder="Shimano, Daiwa, feeder..." />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>Metadata</Badge>
            <Badge tone="accent">Istaknuto</Badge>
            <Badge tone="warn">Rezervisano</Badge>
            <Badge tone="sold">Prodato</Badge>
          </div>
          <div className="mt-6 grid gap-3">
            <Alert tone="success">Izmena je sačuvana.</Alert>
            <Alert tone="error">Izmena nije sačuvana. Pokušajte ponovo.</Alert>
            <Alert tone="warning">Oglas ističe za tri dana.</Alert>
            <Alert tone="info">Nacrt se automatski čuva.</Alert>
          </div>
          <div className="mt-6" aria-label="Loading placeholder example">
            <div className="skeleton h-5 w-2/3" data-motion-skeleton />
          </div>
        </div>

        <div className="surface p-6">
          <h2 className="text-xl font-black">Minimal icon language</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Rounded monoline SVGs remain legible from metadata to empty-state scale.
          </p>
          <div className="mt-8 flex flex-wrap items-end gap-7 text-river-700">
            <SearchIcon size={14} />
            <LocationIcon size={18} />
            <FiltersIcon size={24} />
            <BellIcon size={28} />
            <TrustShieldIcon size={32} />
          </div>
        </div>
      </section>
    </main>
  );
}
