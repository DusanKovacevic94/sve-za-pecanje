import { CreateListingForm } from "@/components/forms/CreateListingForm";
import { apiFetch, Brand, Category } from "@/lib/api";

export const metadata = { title: "Postavi oglas | Sve Za Pecanje" };

export default async function CreateListingPage() {
  const [categories, brands] = await Promise.all([
    apiFetch<Category[]>("/categories").catch(() => ({ data: [] })),
    apiFetch<Brand[]>("/brands").catch(() => ({ data: [] }))
  ]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black">Postavi oglas</h1>
      <p className="mt-2 text-slate-600">Popunite podatke o opremi. Novi oglasi idu na ručni pregled pre objave.</p>
      <div className="mt-6">
        <CreateListingForm categories={categories.data} brands={brands.data} />
      </div>
    </div>
  );
}

