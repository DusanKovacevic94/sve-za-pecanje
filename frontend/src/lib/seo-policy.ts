export const FACET_QUERY_PARAMETERS = [
  "q",
  "category",
  "brand_id",
  "condition",
  "currency",
  "city",
  "price_min",
  "price_max",
  "price_type",
  "delivery_method",
  "with_images",
  "seller_type",
  "posted_within",
  "sort",
  "page",
  "page_size",
] as const;

export function facetRobotsRules() {
  return [
    ...FACET_QUERY_PARAMETERS.map(
      (parameter) => `Disallow: /oglasi?*${parameter}=`,
    ),
    "Disallow: /oglasi?*attributes[",
    "Disallow: /oglasi?*attributes%5B",
  ];
}
