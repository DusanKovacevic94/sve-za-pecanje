export const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";
export const serverApiUrl = process.env.INTERNAL_API_URL ?? publicApiUrl;

export type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = "ERROR",
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

function createServerTimeoutSignal(initSignal?: AbortSignal | null) {
  if (typeof window !== "undefined" || initSignal) {
    return { signal: initSignal ?? undefined, cleanup: () => undefined };
  }
  const timeoutMs = Number(process.env.API_FETCH_TIMEOUT_MS ?? 5000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout)
  };
}

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<ApiResponse<T>> {
  const baseUrl = typeof window === "undefined" ? serverApiUrl : publicApiUrl;
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const cacheOptions = init?.cache || init?.next ? {} : { cache: "no-store" as RequestCache };
  const { signal, cleanup } = createServerTimeoutSignal(init?.signal);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      ...cacheOptions,
      credentials: "include",
      headers,
      signal
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        json?.error?.message ?? "Došlo je do greške.",
        response.status,
        json?.error?.code,
        json?.error?.details
      );
    }
    return json;
  } finally {
    cleanup();
  }
}

export type Category = {
  id: string;
  parent_id: string | null;
  slug: string;
  name_sr: string;
  active_count: number;
  updated_at: string;
  children: Category[];
  attributes: AttributeDefinition[];
};

export type AttributeDefinition = {
  id: string;
  key: string;
  label_sr: string;
  field_type: string;
  unit: string | null;
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  options: { options?: { value: string; label_sr: string }[] };
  validation: {
    min?: number;
    max?: number;
    step?: number;
    filter_mode?: "exact" | "multi" | "range" | "boolean" | "none";
    interval_end?: string;
    visible_when?: Record<string, string | string[]>;
    required_when?: Record<string, string | string[]>;
  };
  sort_order: number;
};

export type Brand = { id: string; name: string; slug: string };
export type City = { id: string; name: string };

export type SearchSuggestion = {
  id: string;
  type: "category" | "brand" | "common_query" | "listing";
  display: string;
  value: string;
  href: string;
  description: string | null;
  source: "catalog" | "dynamic" | "curated" | "listing";
};

export type SearchRecovery = {
  did_you_mean: SearchSuggestion[];
  related_categories: {
    id: string;
    slug: string;
    name_sr: string;
    parent_id: string | null;
  }[];
  recent_listings: ListingCard[];
};

export type SearchBlacklistItem = {
  id: string;
  term_normalized: string;
  created_at: string;
};

export type NotificationType =
  | "new_message"
  | "listing_approved"
  | "listing_rejected"
  | "listing_expiring"
  | "listing_expired"
  | "listing_reserved"
  | "listing_sold"
  | "saved_search_matches"
  | "review_received"
  | "promotion_status"
  | "shop_subscription_status"
  | "moderation_status";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  is_accessible: boolean;
  group_count: number;
  read_at: string | null;
  created_at: string;
  last_event_at: string;
};

export type AttributeDisplay = {
  key: string;
  label_sr: string;
  value: string;
  unit: string | null;
};

export type PriceType = "fixed" | "negotiable" | "on_request" | "free";
export type DeliveryMethod = "personal_pickup" | "courier" | "seller_arrangement";

export type TrustSummary = {
  email_verified: boolean;
  phone_verified: boolean;
  member_since: string;
  review_count: number;
  rating_average: number | null;
  completed_sale_count: number;
};

export type AdminBrand = Brand & {
  aliases: string[];
  category_scope: string[];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type ListingCard = {
  id: string;
  public_id: string;
  title: string;
  slug: string;
  price_type: PriceType;
  price_amount: string | null;
  currency: string;
  delivery_methods: DeliveryMethod[];
  city: string;
  condition: string;
  status: string;
  cover_image_url: string | null;
  seller: {
    id: string;
    username: string;
    display_name: string | null;
    shop_name?: string | null;
    shop_slug?: string | null;
    shop_logo_url?: string | null;
    shop_active?: boolean;
    member_since?: string | null;
    rating_average?: number | null;
    review_count?: number | null;
    active_listing_count?: number | null;
    completed_sale_count?: number;
    trust?: TrustSummary;
  };
  category: { id: string; slug: string; name_sr: string };
  brand: Brand | null;
  key_attributes: AttributeDisplay[];
  is_featured: boolean;
  featured_until?: string | null;
  bumped_at?: string | null;
  view_count?: number;
  favorite_count?: number;
  message_count?: number;
  is_favorited?: boolean;
  created_at: string;
  updated_at: string;
  draft_version: number;
  draft_expires_at: string | null;
  draft_expires_soon: boolean;
  reserved_at: string | null;
};

export type ListingDetail = ListingCard & {
  description: string;
  municipality: string | null;
  model: string | null;
  brand_name_custom: string | null;
  delivery_note: string | null;
  attributes: Record<string, string | number | boolean | string[]>;
  attributes_display: AttributeDisplay[];
  allow_messages: boolean;
  phone_visible: boolean;
  view_count: number;
  favorite_count: number;
  is_favorited: boolean;
  images: { id: string; url: string; sort_order: number; is_cover: boolean }[];
  sold_at: string | null;
  rejection_reason: string | null;
};

export type AdminConfig = {
  app_env: string;
  listing_review_mode: string;
  listing_lifetime_days: number;
  max_listing_images: number;
  max_image_size_mb: number;
  rate_limit_enabled: boolean;
  storage_backend: string;
  use_s3_storage: boolean;
};

export type MessageUser = {
  id: string;
  username: string;
  display_name: string | null;
  trust?: TrustSummary | null;
};

export type ConversationMessage = {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  listing_id: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    status: string;
    price_type: PriceType;
    price_amount: string | null;
    currency: string;
    delivery_methods: DeliveryMethod[];
    delivery_note: string | null;
    reserved_at: string | null;
  };
  buyer_id: string;
  seller_id: string;
  buyer: MessageUser;
  seller: MessageUser;
  counterpart: MessageUser;
  last_message_at: string | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  unread_count: number;
  messages: ConversationMessage[];
  messages_meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type ReviewItem = {
  id: string;
  listing_id: string;
  listing: { id: string; title: string; slug: string } | null;
  reviewer: MessageUser | null;
  reviewee: MessageUser | null;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
};

export type PendingReview = {
  listing: { id: string; title: string; slug: string };
  reviewee: MessageUser;
};

export type BuyerCandidate = MessageUser & {
  last_message_at: string | null;
};

export type MyReviews = {
  received: ReviewItem[];
  given: ReviewItem[];
  pending: PendingReview[];
};

export type FeaturePackage = {
  type?: "featured";
  days: number;
  price_amount: string;
  currency: string;
};

export type PromotionPackage = {
  type: "featured" | "bump" | "homepage";
  option_id: string;
  label: string;
  description: string;
  days: number;
  price_amount: string;
  currency: string;
};

export type FeatureRequest = {
  id: string;
  listing_id: string;
  listing: { id: string; title: string; slug: string } | null;
  user_id: string;
  user?: { id: string; email: string; username: string } | null;
  type: "featured" | "bump" | "homepage";
  type_label: string;
  package_days: number;
  price_amount: string;
  currency: string;
  status: "pending" | "paid" | "rejected";
  payment_reference: string;
  admin_note: string | null;
  paid_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  city: string | null;
  municipality: string | null;
  phone_number: string | null;
  phone_number_e164: string | null;
  phone_visible: boolean;
  phone_verified_at: string | null;
  phone_verification_enabled: boolean;
  bio: string | null;
  fishing_styles: string[];
  member_badges: string[];
  shop_name: string | null;
  shop_slug: string | null;
  shop_logo_url: string | null;
  shop_description: string | null;
  shop_tax_id: string | null;
  shop_registration_number: string | null;
  shop_active_until: string | null;
  shop_active: boolean;
  listing_limit: number;
  notify_messages: boolean;
  notify_saved_searches: boolean;
  notify_listing_expiry: boolean;
  created_at: string;
};

export type ShopProfile = {
  shop_name: string | null;
  shop_slug: string | null;
  shop_logo_url: string | null;
  shop_description: string | null;
  shop_tax_id: string | null;
  shop_registration_number: string | null;
  shop_active_until: string | null;
  shop_active: boolean;
  listing_limit: number;
};

export type ShopPlan = {
  plan: "monthly" | "yearly";
  label: string;
  description: string;
  days: number;
  price_amount: string;
  currency: string;
};

export type ShopSubscriptionRequest = {
  id: string;
  user_id: string;
  user?: { id: string; email: string; username: string; shop_name: string | null } | null;
  plan: "monthly" | "yearly";
  plan_label: string;
  price_amount: string;
  currency: string;
  status: "pending" | "paid" | "rejected";
  payment_reference: string;
  admin_note: string | null;
  activated_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type ShopSummary = ShopProfile & {
  user_id: string;
  username: string | null;
  active_listings_count: number | null;
};

export type ShopDetail = ShopSummary & {
  listings: ListingCard[];
};
