import { apiFetch, Category } from "@/lib/api";

export const metadata = { title: "Kategorije | Sve Za Pecanje" };

export default async function CategoriesPage() {
  const categories = await apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Kategorije</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.data.map((category) => (
          <a key={category.id} href={`/oglasi?category=${category.slug}`} className="focus-ring rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:border-river-500">
            <h2 className="text-xl font-black">{category.name_sr}</h2>
            <p className="mt-2 text-sm text-slate-600">Pogledaj oglase i koristi specifične filtere za ovu opremu.</p>
          </a>
        ))}
      </div>
    </div>
  );
}
