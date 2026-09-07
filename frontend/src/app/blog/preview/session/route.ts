import { NextResponse } from "next/server";
import { signPreview, verifyPreview } from "@/lib/blog-signing";
import {
  previewCookie,
  privateHeaders,
  readPreview,
  sameOrigin,
  siteOrigin,
} from "@/lib/blog-preview";

export async function POST(request: Request) {
  if (
    !sameOrigin(request) ||
    request.headers.get("content-type") !== "application/json"
  )
    return new Response(null, { status: 403, headers: privateHeaders });
  // Streaming body cap applies even without Content-Length.
  const reader = request.body?.getReader();
  let body = "";
  if (!reader)
    return new Response(null, { status: 400, headers: privateHeaders });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      body += new TextDecoder().decode(value);
      if (body.length > 2048)
        return new Response(null, { status: 413, headers: privateHeaders });
    }
    const input = JSON.parse(body),
      claims = verifyPreview(
        typeof input.token === "string" ? input.token : "",
        "handoff",
      );
    if (!claims)
      return new Response(null, { status: 401, headers: privateHeaders });
    const post = await readPreview(claims);
    if (post.id !== claims.post)
      return new Response(null, { status: 401, headers: privateHeaders });
    const session = signPreview({
      ...claims,
      purpose: "session",
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    const response = NextResponse.json(
      { path: `/blog/preview/${claims.post}` },
      { headers: privateHeaders },
    );
    response.cookies.set(previewCookie, session, {
      httpOnly: true,
      secure: siteOrigin().startsWith("https:"),
      sameSite: "strict",
      path: "/blog/preview",
      maxAge: 600,
    });
    return response;
  } catch {
    return new Response(null, { status: 403, headers: privateHeaders });
  } finally {
    await reader.cancel();
  }
}
