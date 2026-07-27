import type { Metadata } from "next";

import { BrowseContent } from "@/components/listings/BrowseContent";
import { apiFetch } from "@/lib/api";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function values(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasParameters = Object.values(params).some((value) =>
    Array.isArray(value) ? value.some(Boolean) : Boolean(value),
  );
  let canonical = "/oglasi";
  const categories = values(params.category);
  const brands = values(params.brand_id);
  if (categories.length === 1) {
    canonical = `/kategorije/${categories[0]}`;
    if (brands.length === 1) {
      const resolution = await apiFetch<{
        canonical_path: string;
        matched_curated_brand: boolean;
      }>(
        `/seo/resolve?category_slug=${encodeURIComponent(categories[0])}&brand_id=${encodeURIComponent(brands[0])}`,
        { next: { revalidate: 300 } },
      ).catch(() => null);
      canonical = resolution?.data.canonical_path ?? canonical;
    }
  }
  return {
    title: "Oglasi za ribolovnu opremu | Sve Za Pecanje",
    alternates: { canonical },
    robots: hasParameters
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export default async function BrowsePage({ searchParams }: PageProps) {
  return <BrowseContent params={await searchParams} />;
}
