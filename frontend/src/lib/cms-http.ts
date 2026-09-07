// Used only by the Node middleware and the server-only CMS client.
export class CMSUnavailable extends Error {
  constructor() {
    super("Blog content is temporarily unavailable");
    this.name = "CMSUnavailable";
  }
}
export async function cmsRead(
  path: string,
  authorization?: string,
  signal?: AbortSignal,
): Promise<unknown> {
  try {
    const origin = new URL(
      process.env.CMS_INTERNAL_URL || "http://127.0.0.1:3002",
    );
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw new Error();
    const response = await fetch(new URL(`/api/${path}`, origin), {
      cache: "no-store",
      redirect: "error",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(4000)])
        : AbortSignal.timeout(4000),
      headers: {
        Accept: "application/json",
        ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
      },
    });
    if (!response.ok) throw new Error();
    // Bound decoded bytes, including chunked responses (not only Content-Length).
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 4_000_000) throw new Error();
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CMSUnavailable();
  }
}
