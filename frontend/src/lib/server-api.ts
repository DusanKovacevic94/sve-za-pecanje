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

function createTimeoutSignal(initSignal?: AbortSignal | null) {
  if (initSignal) {
    return { signal: initSignal, cleanup: () => undefined };
  }
  const timeoutMs = Number(process.env.API_FETCH_TIMEOUT_MS ?? 5000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout)
  };
}

export async function serverApiFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const cacheOptions = init?.cache || init?.next ? {} : { cache: "no-store" as RequestCache };
  const { signal, cleanup } = createTimeoutSignal(init?.signal);
  try {
    const response = await fetch(`${serverApiUrl}${path}`, {
      ...init,
      ...cacheOptions,
      headers: mergeHeaders(init?.headers, cookieStore.toString()),
      signal,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(json?.error?.message ?? "Došlo je do greške.", response.status);
    }
    return json;
  } finally {
    cleanup();
  }
}
