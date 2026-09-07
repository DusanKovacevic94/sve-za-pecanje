import { apiFetch, type Category, type ListingCard } from "./api";

export type BlogMarketplace = {
  category?: Pick<Category, "id" | "slug" | "name_sr">;
  listings: ListingCard[];
  unavailable: boolean;
};

export async function getBlogMarketplace(
  slug?: string,
): Promise<BlogMarketplace> {
  if (!slug) return { listings: [], unavailable: false };
  let category: BlogMarketplace["category"];
  // One budget across both calls; no user cookies, auth, persistent cache or CMS joins.
  const signal = AbortSignal.timeout(3000);
  try {
    const result = await apiFetch<Category>(
      `/categories/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      },
    );
    if (!result.data?.id || result.data.slug !== slug || !result.data.name_sr)
      throw new Error("Invalid category");
    category = { id: result.data.id, slug, name_sr: result.data.name_sr };
    const response = await apiFetch<ListingCard[]>(
      `/listings?${new URLSearchParams({
        category: slug,
        availability: "available",
        page_size: "3",
        sort: "newest",
      })}`,
      { cache: "no-store", credentials: "omit", redirect: "error", signal },
    );
    if (!Array.isArray(response.data)) throw new Error("Invalid listings");
    const listings = response.data
      .filter(
        (item) =>
          item.status === "active" &&
          item.id &&
          item.slug &&
          item.seller?.username &&
          item.category?.name_sr &&
          Array.isArray(item.key_attributes),
      )
      .slice(0, 3);
    return { category, listings, unavailable: false };
  } catch {
    return { category, listings: [], unavailable: true };
  }
}
