import { apiFetch, Category, ListingCard } from "@/lib/api";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://svezapecanje.rs";
  const [categories, listings] = await Promise.all([
    apiFetch<Category[]>("/categories").catch(() => ({ data: [] })),
    apiFetch<ListingCard[]>("/listings?page_size=48").catch(() => ({ data: [] }))
  ]);
  const urls = [
    "",
    "/oglasi",
    "/kategorije",
    "/o-nama",
    "/kontakt",
    "/uslovi-koriscenja",
    "/privatnost",
    "/saveti-za-bezbednost",
    ...categories.data.map((item) => `/oglasi?category=${item.slug}`),
    ...listings.data.map((item) => `/oglasi/${item.slug}`)
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `<url><loc>${base}${url}</loc></url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
