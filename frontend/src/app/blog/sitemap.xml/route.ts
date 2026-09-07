import { getBlogSitemap } from "@/lib/cms";
import { blogURL } from "@/lib/blog-content";
export const dynamic = "force-dynamic";
const escapeXML = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
export async function GET() {
  try {
    const posts = await getBlogSitemap();
    const latest = posts.reduce(
      (date, post) => (post.modifiedAt > date ? post.modifiedAt : date),
      "",
    );
    const urls = [
      { path: "/blog", modified: latest },
      ...posts.map((post) => ({
        path: `/blog/${post.slug}`,
        modified: post.modifiedAt,
      })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeXML(blogURL(url.path))}</loc>${url.modified ? `<lastmod>${escapeXML(url.modified)}</lastmod>` : ""}</url>`).join("")}</urlset>`;
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Blog sitemap temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "30" },
    });
  }
}
