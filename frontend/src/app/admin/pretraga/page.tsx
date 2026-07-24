import { SearchBlacklistManager } from "@/components/admin/SearchBlacklistManager";
import type { SearchBlacklistItem } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export const metadata = { title: "Upravljanje pretragom | Sve Za Pecanje" };

export default async function AdminSearchPage() {
  const response = await serverApiFetch<SearchBlacklistItem[]>(
    "/admin/search-blacklist"
  ).catch(() => ({ data: [] as SearchBlacklistItem[] }));
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-black">Upravljanje pretragom</h1>
      <p className="mt-2 text-slate-600">
        Kontrolišite termine koji ne smeju postati javni popularni predlozi.
      </p>
      <div className="mt-6">
        <SearchBlacklistManager initialItems={response.data} />
      </div>
    </main>
  );
}
