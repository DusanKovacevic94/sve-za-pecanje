import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { previewSession, readPreview } from "@/lib/blog-preview";
import { getBlogMarketplace } from "@/lib/blog-marketplace";
import { BlogMarketplace } from "@/components/blog/BlogMarketplace";
export const dynamic = "force-dynamic";
const load = cache(async (id: string) => {
  const claims = await previewSession(id);
  if (!claims) notFound();
  const post = await readPreview(claims);
  if (post.id !== id) notFound();
  return post;
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await load((await params).id);
  return {};
}
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const post = await load((await params).id);
  const marketplace = await getBlogMarketplace(post.marketplaceCategorySlug);
  return (
    <BlogArticle
      post={post}
      preview
      related={<BlogMarketplace data={marketplace} />}
    />
  );
}
