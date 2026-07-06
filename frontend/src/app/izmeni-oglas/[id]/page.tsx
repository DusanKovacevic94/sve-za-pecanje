import { notFound, redirect } from "next/navigation";

import { CreateListingForm } from "@/components/forms/CreateListingForm";
import { ApiError, type Brand, type Category, type ListingDetail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { serverApiFetch } from "@/lib/server-api";

export const metadata = { title: "Izmeni oglas | Sve Za Pecanje" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/prijava?next=/izmeni-oglas/${id}`);
  }

  let listing: ListingDetail;
  try {
    const response = await serverApiFetch<ListingDetail>(`/listings/${id}/edit`);
    listing = response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiError && error.status === 403) {
      redirect("/nalog/oglasi");
    }
    throw error;
  }

  const [categories, brands] = await Promise.all([
    serverApiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    serverApiFetch<Brand[]>("/brands", { next: { revalidate: 3600 } }).catch(() => ({ data: [] }))
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black">Izmeni oglas</h1>
      <p className="mt-2 text-slate-600">
        Izmene aktivnog oglasa mogu ponovo poslati oglas na pregled administratorima.
      </p>
      <div className="mt-6">
        <CreateListingForm
          mode="edit"
          listingId={listing.id}
          categories={categories.data}
          brands={brands.data}
          defaultValues={{
            category_id: listing.category.id,
            title: listing.title,
            description: listing.description,
            brand_id: listing.brand?.id ?? "",
            model: listing.model ?? "",
            condition: listing.condition,
            price_amount: Number(listing.price_amount),
            currency: listing.currency === "EUR" ? "EUR" : "RSD",
            city: listing.city,
            allow_messages: listing.allow_messages,
            phone_visible: listing.phone_visible,
            attributes: listing.attributes
          }}
          images={listing.images}
        />
      </div>
    </div>
  );
}
