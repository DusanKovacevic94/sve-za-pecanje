// eslint-disable-next-line @typescript-eslint/no-require-imports -- Next config is CommonJS.
const { cmsImagePattern } = require('./config/cms-images.cjs');

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
const cmsPattern = cmsImagePattern(process.env.CMS_S3_PUBLIC_URL);
if (cmsPattern) remotePatterns.push(cmsPattern);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  output: "standalone",
  async headers() {
    return [{ source: "/blog/preview/:path*", headers: [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ] }];
  },
  images: {
    remotePatterns
  },
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL;
    if (!internalApiUrl) return [];
    const backendOrigin = new URL(internalApiUrl).origin;
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
