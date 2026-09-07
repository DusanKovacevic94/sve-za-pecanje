import { NextResponse, type NextRequest } from "next/server";
import { cmsRead } from "@/lib/cms-http";
import { blogSlug, record } from "@/lib/blog-content";
import { signPreview, verifyPreview } from "@/lib/blog-signing";

// Resolve HTTP status before App Router can stream a successful shell. This is
// deliberately blog-only; marketplace availability does not depend on the CMS.
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const status = async (code: 404 | 503) => {
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      ...(code === 503 ? { "Retry-After": "30" } : {}),
    };
    // Next 15 also discards rewrite status codes for streamed App Router pages.
    // Render a fixed local status surface, then return its HTML with an explicit
    // status. Never derive this destination from Host/Forwarded/request headers.
    try {
      const port = process.env.PORT || "3000";
      if (!/^\d{1,5}$/.test(port)) throw new Error();
      const response = await fetch(
        `http://127.0.0.1:${port}/blog-status/${code}`,
        {
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!response.ok) throw new Error();
      return new NextResponse(await response.text(), {
        status: code,
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new NextResponse(
        code === 404
          ? "Članak nije dostupan. Pogledajte ostale članke na /blog."
          : "Blog trenutno nije dostupan. Pokušajte ponovo za nekoliko trenutaka.",
        {
          status: code,
          headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
  };
  if (
    path === "/blog/sitemap.xml" ||
    [
      "/blog/preview/start",
      "/blog/preview/session",
      "/blog/preview/exit",
    ].includes(path)
  )
    return NextResponse.next();
  if (path === "/blog/preview" || path.startsWith("/blog/preview/")) {
    const id = path.slice("/blog/preview/".length),
      claims = verifyPreview(
        request.cookies.get("szp-blog-preview")?.value || "",
        "session",
      );
    if (!claims || claims.post !== id) return status(404);
    try {
      const token = signPreview({
        ...claims,
        purpose: "read",
        exp: Math.floor(Date.now() / 1000) + 30,
      });
      if (String(record(await cmsRead(`blog-preview/${id}`, token)).id) !== id)
        return status(404);
      return NextResponse.next();
    } catch {
      return status(503);
    }
  }
  const slug = path === "/blog" ? undefined : path.slice("/blog/".length);
  if (slug !== undefined && (slug.length > 180 || !blogSlug.test(slug)))
    return status(404);
  const rawPage = request.nextUrl.searchParams.get("page"),
    page = rawPage === null ? 1 : Number(rawPage);
  if (
    !slug &&
    ((rawPage !== null && !/^[1-9]\d*$/.test(rawPage)) ||
      page > 1000 ||
      page < 1 ||
      request.nextUrl.searchParams.getAll("page").length > 1)
  )
    return status(404);
  if (
    !slug &&
    ((page === 1 && rawPage !== null) ||
      [...request.nextUrl.searchParams.keys()].some((key) => key !== "page"))
  ) {
    const destination = request.nextUrl.clone();
    destination.search = page === 1 ? "" : `?page=${page}`;
    return NextResponse.redirect(destination, 308);
  }
  const query = new URLSearchParams({
    "where[_status][equals]": "published",
    draft: "false",
    depth: "0",
    limit: slug ? "1" : "12",
    "select[id]": "true",
    "select[slug]": "true",
    "select[_status]": "true",
    page: String(slug ? 1 : page),
  });
  if (slug) query.set("where[slug][equals]", slug);
  try {
    const result = record(await cmsRead(`posts?${query}`));
    if (!Array.isArray(result.docs) || !Number.isInteger(result.totalPages))
      return status(503);
    if (
      slug &&
      (!result.docs.length ||
        record(result.docs[0])._status !== "published" ||
        record(result.docs[0]).slug !== slug)
    )
      return status(404);
    if (!slug && page > Math.max(Number(result.totalPages), 1))
      return status(404);
    return NextResponse.next();
  } catch {
    return status(503);
  }
}
export const config = { matcher: ["/blog/:path*"], runtime: "nodejs" };
