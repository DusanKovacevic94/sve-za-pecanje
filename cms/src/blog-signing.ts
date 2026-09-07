import { createHmac, timingSafeEqual } from "node:crypto";

// Wire contract shared by CMS and frontend; cross-application tests guard parity.
export type PreviewClaims = {
  purpose: "handoff" | "session" | "read";
  post: string;
  editor: string;
  exp: number;
};
function secret(name: string) {
  const value = process.env[name];
  if (!value || value.length < 32)
    throw new Error("Blog signing configuration is unavailable");
  return value;
}
export function signature(value: string, name = "CMS_PREVIEW_SECRET") {
  return createHmac("sha256", secret(name)).update(value).digest("base64url");
}
export function equalSignature(actual: string, expected: string) {
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function signPreview(claims: PreviewClaims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function verifyPreview(
  token: string,
  purpose: PreviewClaims["purpose"],
  now = Date.now(),
): PreviewClaims | null {
  try {
    if (token.length > 1024) return null;
    const [payload, mac, extra] = token.split(".");
    if (
      !payload ||
      !mac ||
      extra !== undefined ||
      !equalSignature(mac, signature(payload))
    )
      return null;
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as PreviewClaims;
    const maxAge = purpose === "session" ? 600 : 60;
    if (
      claims.purpose !== purpose ||
      typeof claims.post !== "string" ||
      !/^[1-9]\d{0,15}$/.test(claims.post) ||
      typeof claims.editor !== "string" ||
      !/^[1-9]\d{0,15}$/.test(claims.editor) ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= Math.floor(now / 1000) ||
      claims.exp > Math.floor(now / 1000) + maxAge
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}
export function verifyHook(
  body: string,
  timestamp: string,
  mac: string,
  now = Date.now(),
) {
  try {
    return (
      /^\d{13}$/.test(timestamp) &&
      Math.abs(now - Number(timestamp)) <= 60_000 &&
      equalSignature(
        mac,
        signature(`${timestamp}.${body}`, "CMS_REVALIDATE_SECRET"),
      )
    );
  } catch {
    return false;
  }
}
