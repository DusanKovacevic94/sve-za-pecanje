import { SavedSearchManager, type SavedSearchItem } from "@/components/forms/SavedSearchManager";
import { serverApiFetch } from "@/lib/server-api";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SavedSearchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentQuery = typeof params.q === "string" ? params.q : null;
  const currentFilters = Object.fromEntries(
    Object.entries(params)
      .filter(([key, value]) => key !== "q" && key !== "page" && typeof value === "string" && value)
      .map(([key, value]) => [key, value as string])
  );
  const searches = await serverApiFetch<SavedSearchItem[]>("/saved-searches").catch(() => ({
    data: [],
  }));
  return (
    <div>
      <h1 className="text-3xl font-black">Sačuvane pretrage</h1>
      <div className="mt-6">
        <SavedSearchManager
          searches={searches.data}
          currentQuery={currentQuery}
          currentFilters={currentFilters}
        />
      </div>
    </div>
  );
}
