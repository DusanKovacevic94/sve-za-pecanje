# Faceted SEO and curated landing-page policy

The marketplace keeps every filter URL usable for buyers, saved searches, active
chips, and shared links. Search engines receive a deliberately smaller set of
clean landing pages.

This follows Google's guidance that parameter-based faceted navigation can
create an effectively infinite URL space, consume crawler capacity, and slow
discovery of useful pages. Google recommends blocking unneeded facet crawling
and using dedicated listing pages for the variants intended for search. See
[Managing crawling of faceted navigation URLs](https://developers.google.com/crawling/docs/faceted-navigation).

## Indexing rules

| URL family | Robots | Canonical |
| --- | --- | --- |
| `/oglasi` without parameters | `index,follow` | `/oglasi` |
| Any `/oglasi?...` URL | `noindex,follow` | Nearest clean category/curated brand route, otherwise `/oglasi` |
| `/kategorije/{categorySlug}` | Index when active and inventory threshold passes | Self |
| `/kategorije/{categorySlug}/brend/{brandSlug}` | Index only when curated, enabled, verified, and inventory threshold passes | Self |
| Clean landing with additional query parameters | `noindex,follow` | Clean route without parameters |
| Listing detail | Existing behavior is unchanged | `/oglasi/{listingSlug}` |

Every non-empty query string is non-indexable by default. This is intentional:
adding a new filter parameter cannot accidentally make a new URL family
indexable.

Category pages default to a minimum of three active listings. Category-brand
pages default to five and require a stored curation record. An administrator may
override an inventory threshold only with a reason recorded in the audit log.
Overrides never make an empty, inactive-category, or unverified-brand landing
indexable.

## Sitemap and crawler controls

The sitemap asks the backend for currently eligible clean landings. It contains
no parameter URLs and excludes empty, disabled, inactive, or below-threshold
landings. Public listing-detail URLs remain in the sitemap unchanged.

`robots.txt` blocks known `/oglasi` facet parameters after the clean category
routes and curated category-brand routes are available. Filter-removal,
recovery, and pagination links use `rel="nofollow"` where they can multiply
parameter combinations. The UI forms and parameter URLs continue to work for
people.

## Administration

`/admin/seo` supports create, edit, eligibility preview, an indexing toggle,
custom minimum inventory, and audited threshold overrides. Stored curation
contains:

- category and optional brand;
- title and meta description;
- visible introductory copy;
- indexing toggle and minimum active inventory;
- threshold override and required audit reason.

## Search Console release checks

Run these checks after deployment and again after meaningful taxonomy changes:

1. Submit `/sitemap.xml` and verify that discovered URLs are clean category,
   curated category-brand, static, shop, and listing-detail URLs only.
2. Inspect representative clean category and category-brand URLs. Confirm the
   selected canonical is self-referencing and the page is allowed for indexing.
3. Inspect representative query, sort, price, location, pagination,
   multi-category, and dynamic-attribute URLs. Confirm they are not selected as
   indexable pages and canonicalize to the intended stable route.
4. Review **Page indexing → Duplicate without user-selected canonical** and
   **Alternate page with proper canonical** for unexpected growth.
5. Review **Crawl stats** for spikes in `/oglasi?` requests. Compare the
   parameter names with the explicit policy before changing `robots.txt`.
6. Review sitemap coverage for landings that dropped below inventory thresholds;
   disappearance from the sitemap is expected and must not redirect the clean
   route.
7. Check listing-detail samples to confirm their canonical and public URL did
   not change.
8. Review 404 and soft-404 reports for invalid taxonomy slugs separately from
   valid but temporarily thin clean landings.

Do not add a facet to the sitemap or make it indexable based only on search
volume. It needs stable inventory, distinct intent, curated copy, and an
explicit entry in this policy and the automated crawl matrix.
