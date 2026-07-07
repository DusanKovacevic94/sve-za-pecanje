export const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";
export const serverApiUrl = process.env.INTERNAL_API_URL ?? publicApiUrl;

export type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<ApiResponse<T>> {
  const baseUrl = typeof window === "undefined" ? serverApiUrl : publicApiUrl;
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const cacheOptions = init?.cache || init?.next ? {} : { cache: "no-store" as RequestCache };
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    ...cacheOptions,
    credentials: "include",
    headers
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(json?.error?.message ?? "Došlo je do greške.", response.status);
  }
  return json;
}

export type Category = {
  id: string;
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
  options: { options?: { value: string; label_sr: string }[] };
};

export type Brand = { id: string; name: string; slug: string };

export type AttributeDisplay = {
  key: string;
  label_sr: string;
  value: string;
  unit: string | null;
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
  price_amount: string;
  currency: string;
  city: string;
  condition: string;
  status: string;
  cover_image_url: string | null;
  seller: {
    id: string;
    username: string;
    display_name: string | null;
    member_since?: string | null;
    rating_average?: number | null;
    review_count?: number | null;
    active_listing_count?: number | null;
  };
  category: { id: string; slug: string; name_sr: string };
  brand: Brand | null;
  key_attributes: AttributeDisplay[];
  is_featured: boolean;
  featured_until?: string | null;
  is_favorited?: boolean;
  created_at: string;
  updated_at: string;
};

export type ListingDetail = ListingCard & {
  description: string;
  municipality: string | null;
  model: string | null;
  brand_name_custom: string | null;
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
  listing: { id: string; title: string; slug: string; status: string };
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
  package_days: number;
  price_amount: string;
  currency: string;
  status: "pending" | "paid" | "rejected";
  payment_reference: string;
  admin_note: string | null;
  paid_at: string | null;
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
  phone_visible: boolean;
  bio: string | null;
  fishing_styles: string[];
  member_badges: string[];
  notify_messages: boolean;
  notify_saved_searches: boolean;
  notify_listing_expiry: boolean;
  created_at: string;
};
