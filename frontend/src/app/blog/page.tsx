import { BlogLink } from "@/components/blog/BlogLink";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  EditorialIntro,
  EditorialPage,
} from "@/components/editorial/Editorial";
import { BlogPhoto } from "@/components/blog/BlogArticle";
import { Panel, SectionHeading } from "@/components/ui/Primitives";
import { getBlogPage } from "@/lib/cms";
import { blogURL } from "@/lib/blog-content";

export const dynamic = "force-dynamic";
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function load({ searchParams }: Props) {
  const params = await searchParams,
    page = params.page === undefined ? 1 : Number(params.page);
  if (
    (params.page !== undefined &&
      (typeof params.page !== "string" || !/^[1-9]\d*$/.test(params.page))) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1000
  )
    notFound();
  const canonical = page === 1 ? "/blog" : `/blog?page=${page}`;
  if (
    (page === 1 && params.page !== undefined) ||
    Object.keys(params).some((key) => key !== "page")
  )
    permanentRedirect(canonical);
  const result = await getBlogPage(page);
  if (page > Math.max(result.totalPages, 1)) notFound();
  return { ...result, page, canonical };
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { page, canonical } = await load(props);
  const title = `Blog${page > 1 ? ` · Strana ${page}` : ""} | Sve Za Pecanje`;
  const description =
    "Članci o ribolovu i ribolovačkoj opremi na blogu Sve Za Pecanje.";
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: page === 1, follow: true },
    openGraph: { title, description, url: blogURL(canonical), type: "website" },
    twitter: { title, description, card: "summary_large_image" },
  };
}
export default async function BlogIndex(props: Props) {
  const { posts, page, totalPages } = await load(props);
  return (
    <EditorialPage>
      <EditorialIntro title="Blog" />
      {posts.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Panel
              as="section"
              key={post.id}
              className="min-w-0 overflow-hidden p-5 [overflow-wrap:anywhere]"
            >
              <BlogPhoto image={post.cover} />
              <SectionHeading level="card">
                <BlogLink
                  href={`/blog/${post.slug}`}
                  className="focus-ring rounded-xl text-river-700 underline-offset-4 hover:underline"
                >
                  {post.title}
                </BlogLink>
              </SectionHeading>
              <p className="mt-3 text-sm leading-6 text-ink-600">
                {post.excerpt}
              </p>
              <p className="mt-4 text-xs leading-5 text-ink-500">
                {post.author?.name}
                {post.author ? " · " : ""}
                <time dateTime={post.publishedAt}>
                  {new Intl.DateTimeFormat("sr-Latn-RS", {
                    dateStyle: "long",
                    timeZone: "Europe/Belgrade",
                  }).format(new Date(post.publishedAt))}
                </time>
              </p>
            </Panel>
          ))}
        </div>
      ) : (
        <p className="my-10 text-ink-600">
          Još nema objavljenih članaka. U međuvremenu,{" "}
          <BlogLink
            href="/oglasi"
            className="focus-ring rounded-xl text-river-700 underline"
          >
            pogledajte opremu u oglasima
          </BlogLink>
          .
        </p>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Stranice bloga"
          className="mt-8 flex flex-wrap items-center gap-5 text-sm text-river-700"
        >
          {page > 1 ? (
            <BlogLink
              href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}
              className="focus-ring rounded-xl underline"
              rel="prev"
            >
              Prethodna
            </BlogLink>
          ) : null}
          <span>
            Strana {page} od {Math.min(totalPages, 1000)}
          </span>
          {page < Math.min(totalPages, 1000) ? (
            <BlogLink
              href={`/blog?page=${page + 1}`}
              className="focus-ring rounded-xl underline"
              rel="next"
            >
              Sledeća
            </BlogLink>
          ) : null}
        </nav>
      ) : null}
    </EditorialPage>
  );
}
