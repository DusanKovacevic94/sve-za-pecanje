import type { Metadata } from "next";

import {
  CleanLandingPage,
  hasSearchParameters,
  loadSeoLanding,
} from "@/components/seo/CleanLandingPage";

type PageProps = {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const landing = await loadSeoLanding(categorySlug);
  if (!landing) return { title: "Kategorija nije pronađena" };
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

export default async function CategoryLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { categorySlug } = await params;
  return (
    <CleanLandingPage
      categorySlug={categorySlug}
      searchParams={await searchParams}
    />
  );
}
