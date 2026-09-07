import "server-only";
import { cache } from "react";
import { blogSlug, mapPost, record, type BlogPost } from "./blog-content";

import { CMSUnavailable, cmsRead } from "./cms-http";
export { CMSUnavailable, cmsRead } from "./cms-http";
async function queryPosts(
  params: Record<string, string>,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    "where[_status][equals]": "published",
    draft: "false",
    depth: "2",
    sort: "-firstPublishedAt,-id",
    ...params,
  });
  const data = record(await cmsRead(`posts?${query}`, undefined, signal));
  if (
    !Array.isArray(data.docs) ||
    data.docs.length > Number(params.limit) ||
    !Number.isInteger(data.totalPages) ||
    Number(data.totalPages) < 0 ||
    typeof data.hasNextPage !== "boolean"
  )
    throw new CMSUnavailable();
  try {
    return {
      posts: data.docs.map((post) => mapPost(post)),
      totalPages: Number(data.totalPages),
      hasNextPage: data.hasNextPage,
    };
  } catch {
    throw new CMSUnavailable();
  }
}

// React cache only deduplicates metadata/page reads within this request. No ISR,
// Data Cache, stale-on-error or cross-request memory cache contains article data.
export const getBlogPage = cache(async (page = 1) => {
  if (!Number.isInteger(page) || page < 1 || page > 1000)
    throw new Error("Invalid blog page");
  return queryPosts({ page: String(page), limit: "12", "select[body]": "false" });
});
export const getBlogPost = cache(
  async (slug: string): Promise<BlogPost | null> => {
    if (slug.length > 180 || !blogSlug.test(slug)) return null;
    const result = await queryPosts({
      "where[slug][equals]": slug,
      limit: "1",
    });
    if (result.posts[0] && result.posts[0].slug !== slug)
      throw new CMSUnavailable();
    return result.posts[0] || null;
  },
);
export async function getBlogSitemap() {
  const posts: BlogPost[] = [],
    signal = AbortSignal.timeout(12000);
  for (let page = 1; page <= 100; page++) {
    const result = await queryPosts(
      { page: String(page), limit: "100", depth: "0", "select[body]": "false" },
      signal,
    );
    posts.push(...result.posts);
    if (!result.hasNextPage) return posts;
  }
  // Never silently publish a truncated sitemap.
  throw new CMSUnavailable();
}
