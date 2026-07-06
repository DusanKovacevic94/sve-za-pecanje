function remotePatternFromUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/**"
    };
  } catch {
    return null;
  }
}

const configuredImageUrls = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.APP_URL,
  process.env.S3_PUBLIC_URL,
  process.env.HETZNER_STORAGE_PUBLIC_URL,
  process.env.NEXT_PUBLIC_IMAGE_REMOTE_URL,
  `https://${process.env.APP_DOMAIN || "svezapecanje.rs"}`,
  "http://localhost:9000"
];

const remotePatterns = Array.from(
  new Map(
    configuredImageUrls
      .map(remotePatternFromUrl)
      .filter(Boolean)
      .map((pattern) => [`${pattern.protocol}:${pattern.hostname}:${pattern.port ?? ""}`, pattern])
  ).values()
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  output: "standalone",
  images: {
    remotePatterns
  }
};

module.exports = nextConfig;
