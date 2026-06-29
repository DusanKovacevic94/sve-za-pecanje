import { apiFetch } from "@/lib/api";

type SavedSearch = {
  id: string;
  name: string;
  query: string | null;
  filters: Record<string, unknown>;
  matching_count: number;
};

export default async function SavedSearchesPage() {
  const searches = await apiFetch<SavedSearch[]>("/saved-searches").catch(() => ({ data: [] }));
  return (
    <div>
      <h1 className="text-3xl font-black">Sačuvane pretrage</h1>
      <div className="mt-6 grid gap-4">
        {searches.data.map((search) => (
          <article key={search.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="font-black">{search.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{search.query ?? "Bez ključne reči"} · {search.matching_count} rezultata</p>
          </article>
        ))}
        {!searches.data.length ? <p className="rounded-lg bg-white p-6 text-slate-600">Nemate sačuvane pretrage.</p> : null}
      </div>
    </div>
  );
}
