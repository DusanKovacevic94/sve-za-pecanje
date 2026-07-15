import { FeatureListingManager } from "@/components/admin/FeatureListingManager";
import { FeatureRequestManager } from "@/components/admin/FeatureRequestManager";
import { type FeatureRequest, type ListingCard } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FeaturedAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const type = typeof params.type === "string" ? params.type : "";
  const listings = await serverApiFetch<ListingCard[]>("/admin/listings?status=active").catch(() => ({ data: [] }));
  const requests = await serverApiFetch<FeatureRequest[]>(
    `/admin/feature-requests?status=pending${type ? `&type=${type}` : ""}`
  ).catch(() => ({ data: [] }));
  const requestTypes = [
    ["", "Sve promocije"],
    ["featured", "Isticanje"],
    ["bump", "Podizanje"],
    ["homepage", "Početna"]
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black">Promocije</h1>
      <p className="mt-2 text-slate-600">Potvrdite zahteve za ručnu uplatu ili ručno postavite rok isticanja.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {requestTypes.map(([type, label]) => (
          <a
            key={type}
            href={type ? `/admin/istaknuto?type=${type}` : "/admin/istaknuto"}
            className="focus-ring rounded-md bg-white px-3 py-2 text-sm font-semibold shadow-soft hover:text-river-700"
          >
            {label}
          </a>
        ))}
      </div>
      <div className="mt-6">
        <h2 className="text-xl font-black">Zahtevi za uplatu</h2>
        <div className="mt-3">
          <FeatureRequestManager requests={requests.data} />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-black">Ručno isticanje</h2>
        <div className="mt-3">
        <FeatureListingManager listings={listings.data} />
        </div>
      </div>
    </div>
  );
}
