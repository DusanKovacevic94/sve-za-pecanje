import { slugPattern } from './content'

// Server-side only; FastAPI owns taxonomy. Never copy it into the CMS database.
export async function validateMarketplaceCategory(
  value: unknown,
): Promise<true | string> {
  if (!value) return true
  if (
    typeof value !== 'string' ||
    value.length > 180 ||
    !slugPattern.test(value)
  ) {
    return 'Use the slug from a marketplace category URL, not the full URL.'
  }
  try {
    const base =
      process.env.CMS_MARKETPLACE_API_URL || 'http://localhost:8001/api/v1'
    const response = await fetch(
      `${base.replace(/\/$/, '')}/categories/${encodeURIComponent(value)}`,
      {
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(3000),
      },
    )
    if (response.status === 404)
      return 'This marketplace category does not exist or is inactive. Correct or clear the category slug before publishing.'
    if (!response.ok) throw new Error('Marketplace unavailable')
    const { data } = await response.json()
    if (data?.slug !== value || typeof data?.id !== 'string' || !data?.name_sr)
      throw new Error('Invalid category')
    return true
  } catch {
    return 'The marketplace category could not be checked. Your draft can still be saved. Retry publishing when the marketplace is available, or clear this optional field.'
  }
}
