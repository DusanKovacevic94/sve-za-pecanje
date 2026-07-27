import { SeoLandingManager } from "@/components/admin/SeoLandingManager";
import {
  type AdminBrand,
  type Category,
  type SeoLanding,
} from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export const metadata = { title: "SEO landinzi | Sve Za Pecanje" };

export default async function AdminSeoPage() {
  const [landings, categories, brands] = await Promise.all([
    serverApiFetch<SeoLanding[]>("/admin/seo-landings").catch(() => ({ data: [] })),
    serverApiFetch<Category[]>("/admin/categories").catch(() => ({ data: [] })),
    serverApiFetch<AdminBrand[]>("/admin/brands").catch(() => ({ data: [] })),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">SEO landinzi</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Uredite naslov, opis, uvodni tekst i kontrolu indeksiranja za čiste
        kategorijske i category-brand stranice.
      </p>
      <div className="mt-6">
        <SeoLandingManager
          initialLandings={landings.data}
          categories={categories.data}
          brands={brands.data}
        />
      </div>
    </div>
  );
}
