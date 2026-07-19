import { CreateListingForm } from "@/components/forms/CreateListingForm";
import { apiFetch, Brand, Category, type ListingDetail } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

export const metadata = { title: "Postavi oglas | Sve Za Pecanje" };

export default async function CreateListingPage({
  searchParams
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft: draftId } = await searchParams;
  const [categories, brands] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    apiFetch<Brand[]>("/brands", { next: { revalidate: 3600 } }).catch(() => ({ data: [] }))
  ]);
  const resumeDraft = draftId
    ? await serverApiFetch<ListingDetail>(`/listings/${draftId}/edit`)
      .then((response) => response.data.status === "draft" ? response.data : null)
      .catch(() => null)
    : null;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black">Postavi oglas</h1>
      <p className="mt-2 text-slate-600">Popunite podatke o opremi. Novi oglasi idu na ručni pregled pre objave.</p>
      <div className="mt-6">
        <CreateListingForm
          categories={categories.data}
          brands={brands.data}
          resumeDraft={resumeDraft}
        />
      </div>
    </div>
  );
}
