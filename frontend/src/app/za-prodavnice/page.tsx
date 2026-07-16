import { BarChart3, BadgeCheck, Store } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { ShopPlan } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Za prodavnice | Sve Za Pecanje" };

export default async function ForShopsPage() {
  const plans = await apiFetch<ShopPlan[]>("/shops/plans", { next: { revalidate: 3600 } }).catch(() => ({ data: [] as ShopPlan[] }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <BadgeCheck className="text-river-700" size={34} aria-hidden />
          <h1 className="mt-4 text-4xl font-black">Prodavnica na Sve Za Pecanje</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
            Za pecaroške radnje, servise i male uvoznike koji žele svoju stranicu, bedž poverenja i više prostora za aktivne oglase.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/nalog/prodavnica">Zatraži predračun</Button>
            <Button href="/prodavnice" variant="secondary">Pogledaj prodavnice</Button>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Paketi</h2>
          <div className="mt-4 space-y-3">
            {plans.data.map((plan) => (
              <div key={plan.plan} className="rounded-md bg-slate-50 p-4">
                <p className="font-black">{plan.label}</p>
                <p className="mt-1 text-2xl font-black text-river-800">{formatPrice(plan.price_amount, plan.currency)}</p>
                <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { Icon: Store, title: "Brendirana stranica", copy: "Logo, opis i svi aktivni oglasi prodavnice na jednoj adresi." },
          { Icon: BadgeCheck, title: "Bedž prodavnice", copy: "Oglasi aktivne prodavnice dobijaju vidljiv signal poverenja." },
          { Icon: BarChart3, title: "Statistika oglasa", copy: "Pregledi, omiljeni i poruke ostaju dostupni po oglasu u nalogu." }
        ].map(({ Icon, title, copy }) => (
          <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <Icon className="text-river-700" size={24} aria-hidden />
            <h2 className="mt-4 text-xl font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
