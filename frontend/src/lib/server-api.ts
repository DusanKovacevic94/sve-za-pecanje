import "server-only";

import { cookies } from "next/headers";

import { ApiError, type ApiResponse, serverApiUrl } from "@/lib/api";

function mergeHeaders(initHeaders?: HeadersInit, cookieHeader?: string) {
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (cookieHeader && !headers.has("Cookie")) {
    headers.set("Cookie", cookieHeader);
  }
  return headers;
}

export async function serverApiFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const cacheOptions = init?.cache || init?.next ? {} : { cache: "no-store" as RequestCache };
  const response = await fetch(`${serverApiUrl}${path}`, {
    ...init,
    ...cacheOptions,
    headers: mergeHeaders(init?.headers, cookieStore.toString()),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(json?.error?.message ?? "Došlo je do greške.", response.status);
  }
  return json;
}
