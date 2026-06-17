import { cookies } from "next/headers";

import { serverApiUrl } from "@/lib/api";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const response = await fetch(`${serverApiUrl}/auth/me`, {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store"
    });
    if (!response.ok) return null;
    const json = await response.json();
    return json.data.user as { id: string; username: string; role: string };
  } catch {
    return null;
  }
}
