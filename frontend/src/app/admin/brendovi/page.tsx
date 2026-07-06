import { BrandManager } from "@/components/admin/BrandManager";
import { type AdminBrand } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export default async function AdminBrandsPage() {
  const brands = await serverApiFetch<AdminBrand[]>("/admin/brands").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">Brendovi</h1>
      <p className="mt-2 text-slate-600">Dodavanje, preimenovanje i spajanje brendova iz oglasa.</p>
      <div className="mt-6">
        <BrandManager brands={brands.data} />
      </div>
    </div>
  );
}
