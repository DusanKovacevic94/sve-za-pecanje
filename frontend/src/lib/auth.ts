import { cache } from "react";

import { serverApiFetch } from "@/lib/server-api";

export const getCurrentUser = cache(async () => {
  try {
    const response = await serverApiFetch<{
      user: { id: string; username: string; role: string };
    }>("/auth/me");
    return response.data.user;
  } catch {
    return null;
  }
});
