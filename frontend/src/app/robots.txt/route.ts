export function GET() {
  return new Response(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /nalog

Sitemap: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://svezapecanje.rs"}/sitemap.xml
`,
    { headers: { "Content-Type": "text/plain" } }
  );
}
