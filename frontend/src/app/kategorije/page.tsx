import Link from "next/link";

import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { apiFetch, Category } from "@/lib/api";

export const metadata = { title: "Kategorije | Sve Za Pecanje" };

export default async function CategoriesPage() {
  const categories = await apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Kategorije</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.data.map((category) => (
          <Link key={category.id} href={`/oglasi?category=${category.slug}`} className="surface p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-river-50 text-river-700">
              <CategoryIcon slug={category.slug} name={category.name_sr} />
            </div>
            <h2 className="mt-4 text-xl font-black">{category.name_sr}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {category.active_count ?? 0} aktivnih oglasa. Pogledaj oglase i koristi specifične filtere za ovu opremu.
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
