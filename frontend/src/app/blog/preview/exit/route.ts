import { NextResponse } from "next/server";
import {
  previewCookie,
  privateHeaders,
  sameOrigin,
  siteOrigin,
} from "@/lib/blog-preview";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return new Response(null, { status: 403, headers: privateHeaders });
  const response =
    request.headers.get("accept") === "application/json"
      ? NextResponse.json({ exited: true })
      : NextResponse.redirect(new URL("/blog", siteOrigin()), 303);
  for (const [key, value] of Object.entries(privateHeaders))
    response.headers.set(key, value);
  response.cookies.set(previewCookie, "", {
    httpOnly: true,
    secure: siteOrigin().startsWith("https:"),
    sameSite: "strict",
    path: "/blog/preview",
    maxAge: 0,
  });
  return response;
}
