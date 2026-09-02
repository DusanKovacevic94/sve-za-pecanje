import Link from "next/link";
import { notFound } from "next/navigation";

import { BrowseContent } from "@/components/listings/BrowseContent";
import { ApiError, apiFetch, type SeoLanding } from "@/lib/api";

type SearchParams = Record<string, string | string[] | undefined>;

export async function loadSeoLanding(
  categorySlug: string,
  brandSlug?: string,
): Promise<SeoLanding | null> {
  const path = brandSlug
    ? `/seo/landing/${categorySlug}/brand/${brandSlug}`
    : `/seo/landing/${categorySlug}`;
  return apiFetch<SeoLanding>(path, { next: { revalidate: 300 } })
    .then((response) => response.data)
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    });
}

export function hasSearchParameters(searchParams: SearchParams) {
  return Object.values(searchParams).some((value) =>
    Array.isArray(value) ? value.some(Boolean) : Boolean(value),
  );
}

export async function CleanLandingPage({
  categorySlug,
  brandSlug,
  searchParams,
}: {
  categorySlug: string;
  brandSlug?: string;
  searchParams: SearchParams;
}) {
  const landing = await loadSeoLanding(categorySlug, brandSlug);
  if (!landing) notFound();
  const params: SearchParams = {
    ...searchParams,
    category: landing.category.slug,
    brand_id: landing.brand?.id,
  };
  const breadcrumbs = [
    { name: "Početna", href: "/" },
    { name: "Kategorije", href: "/kategorije" },
    ...(landing.brand
      ? [
          {
            name: landing.category.name_sr,
            href: `/kategorije/${landing.category.slug}`,
          },
        ]
      : []),
    {
      name: landing.brand?.name ?? landing.category.name_sr,
      href: landing.canonical_path,
    },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href,
    })),
  };
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: landing.title,
    description: landing.meta_description,
    url: landing.canonical_path,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: landing.active_listing_count,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <nav
        aria-label="Putanja"
        className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pt-8 text-sm font-semibold text-ink-600"
      >
        {breadcrumbs.map((item, index) => (
          <span key={item.href} className="contents">
            {index ? <span>/</span> : null}
            {index === breadcrumbs.length - 1 ? (
              <span aria-current="page">{item.name}</span>
            ) : (
              <Link href={item.href} className="hover:text-river-700">
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <BrowseContent
        params={params}
        landing={{
          title: landing.title,
          intro_copy: landing.intro_copy,
        }}
      />
    </>
  );
}
