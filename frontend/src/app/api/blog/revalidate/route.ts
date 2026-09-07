import { revalidatePath, revalidateTag } from "next/cache";
import { verifyHook } from "@/lib/blog-signing";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const reader = request.body?.getReader();
  let body = "";
  if (!reader) return new Response(null, { status: 400, headers });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      body += new TextDecoder().decode(value);
      if (body.length > 4096)
        return new Response(null, { status: 413, headers });
    }
    if (
      !verifyHook(
        body,
        request.headers.get("x-blog-timestamp") || "",
        request.headers.get("x-blog-signature") || "",
      )
    )
      return new Response(null, { status: 401, headers });
    const event = JSON.parse(body);
    if (
      event.version !== 1 ||
      !["posts", "authors", "media"].includes(event.collection) ||
      !["change", "delete"].includes(event.operation) ||
      !/^[1-9]\d{0,15}$/.test(String(event.id))
    )
      return new Response(null, { status: 400, headers });
    // Fixed allowlist, never accept a caller-provided URL/path/tag. On Next 15 the
    // one-argument API expires a tag; no v16 cache API is used here.
    for (const tag of [
      "blog:posts",
      "blog:authors",
      "blog:media",
      "blog:sitemap",
    ])
      revalidateTag(tag);
    revalidatePath("/blog", "layout");
    revalidatePath("/blog/sitemap.xml");
    return Response.json({ revalidated: true }, { headers });
  } catch {
    return new Response(null, { status: 400, headers });
  } finally {
    await reader.cancel();
  }
}
