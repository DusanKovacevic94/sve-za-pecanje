"use client";

import { useMemo, useState } from "react";
import { Bell, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiFetch, type Category } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { deliveryMethodLabels, priceTypeLabels } from "@/lib/format";

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
    if (Array.isArray(value)) {
      value.filter((item) => item !== undefined && item !== null && String(item) !== "").forEach((item) => {
        params.append(key, String(item));
      });
    } else if (value !== undefined && value !== null && String(value) !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `/oglasi?${query}` : "/oglasi";
}

function defaultName(query: string | null, filters: Record<string, string | string[] | undefined>) {
  if (query) return `Pretraga: ${query}`;
  if (typeof filters.category === "string" && filters.category) return `Kategorija: ${filters.category}`;
  if (Array.isArray(filters.category) && filters.category.length) {
    return `Kategorije: ${filters.category.length}`;
  }
  const first = Object.values(filters).find(Boolean);
  return first ? `Filter: ${Array.isArray(first) ? first.join(", ") : first}` : "Moja pretraga";
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children)
  ]);
}

function filterSummary(filters: Record<string, unknown>, categories: Category[]) {
  const values = (value: unknown) => Array.isArray(value) ? value.map(String) : [String(value)];
  const flattened = flattenCategories(categories);
  const selectedCategories = values(filters.category)
    .map((slug) => flattened.find((item) => item.slug === slug))
    .filter((item): item is Category => Boolean(item));
  const rootIds = new Set(
    selectedCategories.map((item) => item.parent_id ?? item.id)
  );
  const category = selectedCategories.length === 1
    ? selectedCategories[0]
    : rootIds.size === 1
      ? flattened.find((item) => item.id === [...rootIds][0])
      : undefined;
  const globalLabels: Record<string, string> = {
    price_min: "Cena od",
    price_max: "Cena do",
    price_type: "Tip cene",
    delivery_method: "Preuzimanje i dostava",
    currency: "Valuta",
    city: "Grad",
    condition: "Stanje",
    brand_id: "Brend",
    seller_type: "Prodavac",
    posted_within: "Objavljeno",
    with_images: "Sa slikom"
  };
  return Object.entries(filters).map(([key, value]) => {
    if (key === "category") {
      const labels = values(value).map(
        (slug) => flattened.find((item) => item.slug === slug)?.name_sr ?? slug
      );
      return `Kategorije: ${labels.join(", ")}`;
    }
    const match = /^attributes\[([^\]]+)\](?:\[(min|max)\])?$/.exec(key);
    if (match) {
      const attribute = category?.attributes.find((item) => item.key === match[1]);
      const optionLabels = new Map(
        attribute?.options.options?.map((option) => [option.value, option.label_sr]) ?? []
      );
      const shown = values(value).map((item) => optionLabels.get(item) ?? item).join(", ");
      const bound = match[2] === "min" ? " od" : match[2] === "max" ? " do" : "";
      return `${attribute?.label_sr ?? match[1]}${bound}: ${shown}${attribute?.unit ? ` ${attribute.unit}` : ""}`;
    }
    const shownValues = values(value).map((item) => {
      if (key === "price_type") return priceTypeLabels[item] ?? item;
      if (key === "delivery_method") return deliveryMethodLabels[item] ?? item;
      return item;
    });
    return `${globalLabels[key] ?? key}: ${shownValues.join(", ")}`;
  });
}

export function SavedSearchManager({
  searches,
  currentQuery,
  currentFilters,
  categories
}: {
  searches: SavedSearchItem[];
  currentQuery: string | null;
  currentFilters: Record<string, string | string[] | undefined>;
  categories: Category[];
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
                {Object.keys(search.filters).length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {filterSummary(search.filters, categories).join(" · ")}
                  </p>
                ) : null}
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
