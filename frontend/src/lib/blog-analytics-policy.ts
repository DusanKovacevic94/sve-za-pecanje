// Server-side deployment/fixture policy; no environment values enter event properties.
export function blogAnalyticsEnabled(
  post: { id: string; slug: string },
  enabled = process.env.BLOG_ANALYTICS_ENABLED,
  excluded = process.env.BLOG_ANALYTICS_EXCLUDED_POST_IDS || "",
) {
  return (
    enabled === "true" &&
    !post.slug.startsWith("probni-") &&
    !excluded
      .split(",")
      .map((id) => id.trim())
      .includes(post.id)
  );
}
