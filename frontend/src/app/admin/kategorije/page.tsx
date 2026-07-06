import { type Category } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export default async function AdminCategoriesPage() {
  const categories = await serverApiFetch<Category[]>("/admin/categories").catch(() => ({ data: [] }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black">Kategorije</h1>
      <p className="mt-2 text-slate-600">Pregled kategorija i definicija atributa koje koristi forma oglasa.</p>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        {categories.data.map((category) => (
          <article key={category.id} className="border-b border-slate-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">{category.name_sr}</h2>
                <p className="text-sm text-slate-500">{category.slug}</p>
              </div>
              <span className="text-sm font-semibold text-slate-600">{category.attributes.length} atributa</span>
            </div>
            {category.attributes.length ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {category.attributes.map((attribute) => (
                  <div key={attribute.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="font-semibold">{attribute.label_sr}</p>
                    <p className="text-slate-600">
                      {attribute.key} · {attribute.field_type}
                      {attribute.required ? " · obavezno" : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
