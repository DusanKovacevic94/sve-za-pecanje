import Link from "next/link";

import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { apiFetch, Category } from "@/lib/api";

export const metadata = { title: "Kategorije | Sve Za Pecanje" };

export default async function CategoriesPage() {
  const categories = await apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Kategorije</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.data.map((category) => (
          <article key={category.id} className="surface p-5">
            <Link href={`/kategorije/${category.slug}`} className="block motion-safe:transition-transform motion-safe:hover:-translate-y-0.5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-river-50 text-river-700">
              <CategoryIcon slug={category.slug} name={category.name_sr} />
            </div>
            <h2 className="mt-4 text-xl font-extrabold">{category.name_sr}</h2>
            <p className="mt-2 text-sm text-ink-600">
              {category.active_count ?? 0} aktivnih oglasa. Pogledaj oglase i koristi specifične filtere za ovu opremu.
            </p>
            </Link>
            {category.children.length ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-sand-200 pt-4">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/kategorije/${child.slug}`}
                    className="focus-ring rounded-xl bg-sand-50 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-river-50 hover:text-river-700"
                  >
                    {child.name_sr} ({child.active_count})
                  </Link>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
