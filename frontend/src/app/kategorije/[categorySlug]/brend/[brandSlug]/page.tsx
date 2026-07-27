import type { Metadata } from "next";

import {
  CleanLandingPage,
  hasSearchParameters,
  loadSeoLanding,
} from "@/components/seo/CleanLandingPage";

type PageProps = {
  params: Promise<{ categorySlug: string; brandSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { categorySlug, brandSlug } = await params;
  const landing = await loadSeoLanding(categorySlug, brandSlug);
  if (!landing) return { title: "SEO landing nije pronađen" };
  const hasParameters = hasSearchParameters(await searchParams);
  return {
    title: landing.title,
    description: landing.meta_description,
    alternates: { canonical: landing.canonical_path },
    robots: {
      index: landing.is_indexable && !hasParameters,
      follow: true,
    },
  };
}

export default async function CategoryBrandLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { categorySlug, brandSlug } = await params;
  return (
    <CleanLandingPage
      categorySlug={categorySlug}
      brandSlug={brandSlug}
      searchParams={await searchParams}
    />
  );
}
