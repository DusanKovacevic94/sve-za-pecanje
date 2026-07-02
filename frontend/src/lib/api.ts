export const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";
export const serverApiUrl = process.env.INTERNAL_API_URL ?? publicApiUrl;

export type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const baseUrl = typeof window === "undefined" ? serverApiUrl : publicApiUrl;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
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
  seller: { id: string; username: string; display_name: string | null };
  category: { id: string; slug: string; name_sr: string };
  brand: Brand | null;
  key_attributes: Record<string, string | number | boolean>;
  is_featured: boolean;
  created_at: string;
};

export type ListingDetail = ListingCard & {
  description: string;
  municipality: string | null;
  model: string | null;
  brand_name_custom: string | null;
  attributes: Record<string, string | number | boolean | string[]>;
  allow_messages: boolean;
  phone_visible: boolean;
  view_count: number;
  favorite_count: number;
  images: { id: string; url: string; sort_order: number; is_cover: boolean }[];
  sold_at: string | null;
  rejection_reason: string | null;
};
