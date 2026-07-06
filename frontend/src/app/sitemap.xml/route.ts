import { apiFetch, Category, ListingCard } from "@/lib/api";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children ?? [])]);
}

async function getAllListings() {
  const first = await apiFetch<ListingCard[]>("/listings?page_size=48", { next: { revalidate: 300 } }).catch(() => ({
    data: [] as ListingCard[],
    meta: { total_pages: 1 }
  }));
  const totalPages = Number(first.meta?.total_pages ?? 1);
  const rest = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
      apiFetch<ListingCard[]>(`/listings?page_size=48&page=${index + 2}`, { next: { revalidate: 300 } }).catch(() => ({
        data: [] as ListingCard[]
      }))
    )
  );
  return [first.data, ...rest.map((response) => response.data)].flat();
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://svezapecanje.rs";
  const [categories, listings] = await Promise.all([
    apiFetch<Category[]>("/categories", { next: { revalidate: 3600 } }).catch(() => ({ data: [] })),
    getAllListings()
  ]);
  const now = new Date().toISOString();
  const categoryRows = flattenCategories(categories.data);
  const urls: { loc: string; lastModified: string }[] = [
    { loc: "", lastModified: now },
    { loc: "/oglasi", lastModified: now },
    { loc: "/kategorije", lastModified: now },
    { loc: "/o-nama", lastModified: now },
    { loc: "/kontakt", lastModified: now },
    { loc: "/uslovi-koriscenja", lastModified: now },
    { loc: "/privatnost", lastModified: now },
    { loc: "/saveti-za-bezbednost", lastModified: now },
    ...categoryRows.map((item) => ({ loc: `/oglasi?category=${item.slug}`, lastModified: item.updated_at ?? now })),
    ...listings.map((item) => ({ loc: `/oglasi/${item.slug}`, lastModified: item.updated_at ?? now }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) =>
      `<url><loc>${escapeXml(`${base}${url.loc}`)}</loc><lastmod>${escapeXml(url.lastModified)}</lastmod></url>`
  )
  .join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
