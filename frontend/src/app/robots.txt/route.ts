import { facetRobotsRules } from "@/lib/seo-policy";

export function GET() {
  return new Response(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /nalog
${facetRobotsRules().join("\n")}

Sitemap: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://svezapecanje.rs"}/sitemap.xml
`,
    { headers: { "Content-Type": "text/plain" } }
  );
}
