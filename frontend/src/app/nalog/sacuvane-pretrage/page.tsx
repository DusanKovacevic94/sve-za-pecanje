import { SavedSearchManager, type SavedSearchItem } from "@/components/forms/SavedSearchManager";
import type { Category } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SavedSearchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentQuery = typeof params.q === "string" ? params.q : null;
  const currentFilters = Object.fromEntries(
    Object.entries(params)
      .filter(([key, value]) => key !== "q" && key !== "page" && (Array.isArray(value) ? value.length : Boolean(value)))
      .map(([key, value]) => [key, value])
  );
  const [searches, categories] = await Promise.all([
    serverApiFetch<SavedSearchItem[]>("/saved-searches").catch(() => ({ data: [] })),
    serverApiFetch<Category[]>("/categories").catch(() => ({ data: [] }))
  ]);
  return (
    <div>
      <h1 className="text-3xl font-extrabold">Sačuvane pretrage</h1>
      <div className="mt-6">
        <SavedSearchManager
          searches={searches.data}
          currentQuery={currentQuery}
          currentFilters={currentFilters}
          categories={categories.data}
        />
      </div>
    </div>
  );
}
