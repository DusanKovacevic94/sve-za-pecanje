import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ShopSummary } from "@/lib/api";
import { apiFetch } from "@/lib/api";

export const metadata = { title: "Prodavnice | Sve Za Pecanje" };

export default async function ShopsPage() {
  const shops = await apiFetch<ShopSummary[]>("/shops/", { next: { revalidate: 120 } }).catch(() => ({ data: [] as ShopSummary[] }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Prodavnice</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Aktivne pecaroške radnje i uvoznici sa oglasima na Sve Za Pecanje.</p>
        </div>
        <Button href="/za-prodavnice" variant="secondary">Za prodavnice</Button>
      </div>
      {shops.data.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.data.map((shop) => (
            <Link key={shop.user_id} href={`/prodavnice/${shop.shop_slug}`} className="focus-ring rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:border-river-500">
              <div className="flex items-center gap-3">
                <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-river-700 text-lg font-black text-white">
                  {shop.shop_logo_url ? (
                    <Image src={shop.shop_logo_url} alt={shop.shop_name ?? "Logo prodavnice"} fill sizes="56px" className="object-cover" />
                  ) : (
                    (shop.shop_name ?? "SZ").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black">{shop.shop_name}</h2>
                  <Badge>Prodavnica</Badge>
                </div>
              </div>
              {shop.shop_description ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{shop.shop_description}</p> : null}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-soft">
          <h2 className="text-xl font-black">Još nema aktivnih prodavnica.</h2>
          <p className="mt-2 text-slate-600">Prve prodavnice će se prikazati ovde posle aktivacije pretplate.</p>
        </div>
      )}
    </div>
  );
}
