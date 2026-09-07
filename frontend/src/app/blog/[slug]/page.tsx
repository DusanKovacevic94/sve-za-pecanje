import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { getBlogPost } from "@/lib/cms";
import { blogURL, jsonLD } from "@/lib/blog-content";
import { getBlogMarketplace } from "@/lib/blog-marketplace";
import { blogAnalyticsEnabled } from "@/lib/blog-analytics-policy";
import { BlogMarketplace } from "@/components/blog/BlogMarketplace";
import {
  BlogAnalytics,
  type BlogTarget,
} from "@/components/blog/BlogAnalytics";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
async function load({ params }: Props) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  return post;
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const post = await load(props),
    url = blogURL(`/blog/${post.slug}`);
  const images = post.cover
    ? [
        {
          url: post.cover.url,
          width: post.cover.width,
          height: post.cover.height,
          alt: post.cover.alt,
        },
      ]
    : [{ url: blogURL("/opengraph-image.png") }];
  return {
    title: `${post.seoTitle} | Sve Za Pecanje`,
    description: post.seoDescription,
    alternates: { canonical: url },
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      type: "article",
      url,
      images,
      publishedTime: post.publishedAt,
      modifiedTime: post.editorialUpdatedAt || post.publishedAt,
      authors: post.author ? [post.author.name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.seoDescription,
      images,
    },
  };
}
export default async function BlogPostPage(props: Props) {
  const post = await load(props),
    url = blogURL(`/blog/${post.slug}`);
  const marketplace = await getBlogMarketplace(post.marketplaceCategorySlug);
  const targets: BlogTarget[] = marketplace.listings.map((listing) => ({
    path: `/oglasi/${listing.slug}`,
    id: listing.id,
    kind: "listing",
  }));
  if (marketplace.category)
    targets.push({
      path: `/kategorije/${marketplace.category.slug}`,
      id: marketplace.category.id,
      kind: "category",
    });
  const analyticsEnabled = blogAnalyticsEnabled(post);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      mainEntityOfPage: url,
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.editorialUpdatedAt || post.publishedAt,
      inLanguage: "sr-Latn-RS",
      image: post.cover?.url,
      author: post.author
        ? { "@type": "Person", name: post.author.name }
        : undefined,
      publisher: {
        "@type": "Organization",
        name: "Sve Za Pecanje",
        url: blogURL("/"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Početna",
          item: blogURL("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: blogURL("/blog"),
        },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLD(schema) }}
      />
      <BlogAnalytics
        postId={post.id}
        enabled={analyticsEnabled}
        targets={targets}
      >
        <BlogArticle
          post={post}
          related={<BlogMarketplace data={marketplace} />}
        />
      </BlogAnalytics>
    </>
  );
}
