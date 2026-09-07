import "server-only";
import { cookies } from "next/headers";
import { cmsRead } from "./cms";
import { mapPost } from "./blog-content";
import { signPreview, verifyPreview, type PreviewClaims } from "./blog-signing";

export const previewCookie = "szp-blog-preview";
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
};
export function siteOrigin() {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .origin;
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === siteOrigin();
}
export async function readPreview(claims: PreviewClaims) {
  const token = signPreview({
    ...claims,
    purpose: "read",
    exp: Math.floor(Date.now() / 1000) + 30,
  });
  return mapPost(await cmsRead(`blog-preview/${claims.post}`, token), true);
}
export async function previewSession(post: string) {
  const claims = verifyPreview(
    (await cookies()).get(previewCookie)?.value || "",
    "session",
  );
  return claims?.post === post ? claims : null;
}
