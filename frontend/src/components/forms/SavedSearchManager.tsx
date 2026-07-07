"use client";

import { useMemo, useState } from "react";
import { Bell, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export type SavedSearchItem = {
  id: string;
  name: string;
  query: string | null;
  filters: Record<string, unknown>;
  notification_enabled: boolean;
  matching_count: number;
};

function searchUrl(search: Pick<SavedSearchItem, "query" | "filters">) {
  const params = new URLSearchParams();
  if (search.query) params.set("q", search.query);
  Object.entries(search.filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `/oglasi?${query}` : "/oglasi";
}

function defaultName(query: string | null, filters: Record<string, string>) {
  if (query) return `Pretraga: ${query}`;
  if (filters.category) return `Kategorija: ${filters.category}`;
  const first = Object.values(filters).find(Boolean);
  return first ? `Filter: ${first}` : "Moja pretraga";
}

export function SavedSearchManager({
  searches,
  currentQuery,
  currentFilters
}: {
  searches: SavedSearchItem[];
  currentQuery: string | null;
  currentFilters: Record<string, string>;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName(currentQuery, currentFilters));
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const { pushToast } = useToast();
  const hasCurrentSearch = Boolean(currentQuery || Object.keys(currentFilters).length);
  const visibleSearches = useMemo(() => searches, [searches]);

  async function createSearch() {
    setMessage(null);
    try {
      await apiFetch<SavedSearchItem>("/saved-searches", {
        method: "POST",
        body: JSON.stringify({
          name,
          query: currentQuery || null,
          filters: currentFilters,
          notification_enabled: notify
        })
      });
      trackEvent("saved_search_created");
      router.refresh();
      setMessage("Pretraga je sačuvana.");
      pushToast("Pretraga je sačuvana.", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Pretraga nije sačuvana.";
      setMessage(errorMessage);
      pushToast(errorMessage, "error");
    }
  }

  async function deleteSearch(id: string) {
    if (!window.confirm("Obrisati sačuvanu pretragu?")) return;
    setMessage(null);
    try {
      await apiFetch<{ message: string }>(`/saved-searches/${id}`, { method: "DELETE" });
      router.refresh();
      pushToast("Pretraga je obrisana.", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Pretraga nije obrisana.";
      setMessage(errorMessage);
      pushToast(errorMessage, "error");
    }
  }

  return (
    <div className="space-y-6">
      {hasCurrentSearch ? (
        <section className="rounded-lg border border-river-100 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Sačuvaj ovu pretragu</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <FieldLabel htmlFor="saved-search-name">Naziv</FieldLabel>
              <Input id="saved-search-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <Button type="button" className="self-end" onClick={createSearch}>
              <Bell size={18} /> Sačuvaj
            </Button>
          </div>
          <label className="mt-3 flex gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
            Obaveštavaj me o novim oglasima
          </label>
        </section>
      ) : null}

      {message ? <p className="rounded-md bg-river-50 p-3 text-sm font-semibold text-river-700">{message}</p> : null}

      <div className="grid gap-4">
        {visibleSearches.map((search) => (
          <article key={search.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="font-black">{search.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {search.query ?? "Bez ključne reči"} · {search.matching_count} rezultata
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href={searchUrl(search)} variant="secondary">
                  <Search size={18} /> Pokreni
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => deleteSearch(search.id)}
                  aria-label="Obriši pretragu"
                  title="Obriši pretragu"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          </article>
        ))}
        {!visibleSearches.length ? (
          <EmptyState title="Nemate sačuvane pretrage" copy="Sačuvajte filtere sa stranice oglasa i dobijajte brži pregled novih rezultata." action={{ href: "/oglasi", label: "Pregledaj oglase" }} />
        ) : null}
      </div>
    </div>
  );
}
