import { BlogLink } from "@/components/blog/BlogLink";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  EditorialFacts,
  EditorialIntro,
  EditorialPage,
} from "@/components/editorial/Editorial";
import type { BlogImage, BlogNode, BlogPost } from "@/lib/blog-content";
import { PreviewExit } from "./PreviewExit";

export function BlogPhoto({
  image,
  caption,
  priority = false,
}: {
  image?: BlogImage;
  caption?: string;
  priority?: boolean;
}) {
  if (!image) return null;
  return (
    <figure className="my-8">
      <Image
        src={image.url}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(max-width: 768px) 100vw, 768px"
        priority={priority}
        className="h-auto w-full rounded-xl bg-sand-100"
      />
      {caption || image.caption || image.credit ? (
        <figcaption className="mt-2 text-sm leading-6 text-ink-600">
          {caption || image.caption}
          {image.credit ? (
            <span className="block">Fotografija: {image.credit}</span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
function renderNodes(nodes: BlogNode[]): ReactNode {
  return nodes.map((node, index) => {
    const children = renderNodes(node.children);
    switch (node.type) {
      case "text": {
        let value: ReactNode = node.text;
        if ((node.format || 0) & 1) value = <strong>{value}</strong>;
        if ((node.format || 0) & 2) value = <em>{value}</em>;
        return <span key={index}>{value}</span>;
      }
      case "root":
        return <div key={index}>{children}</div>;
      case "paragraph":
        return (
          <p className="my-5" key={index}>
            {children}
          </p>
        );
      case "heading": {
        const Tag = node.tag === "h3" ? "h3" : "h2";
        return (
          <Tag
            key={index}
            className="mb-4 mt-8 text-xl font-extrabold leading-snug text-ink sm:text-2xl"
          >
            {children}
          </Tag>
        );
      }
      case "linebreak":
        return <br key={index} />;
      case "list":
        return node.listType === "number" ? (
          <ol key={index} className="my-5 list-decimal space-y-2 pl-6">
            {children}
          </ol>
        ) : (
          <ul key={index} className="my-5 list-disc space-y-2 pl-6">
            {children}
          </ul>
        );
      case "listitem":
        return <li key={index}>{children}</li>;
      case "quote":
        return (
          <blockquote
            key={index}
            className="my-6 border-l-2 border-river-700 pl-5 text-ink-600"
          >
            {children}
          </blockquote>
        );
      case "link":
        return node.href ? (
          <BlogLink
            key={index}
            href={node.href}
            className="focus-ring rounded-xl text-river-700 underline underline-offset-4"
          >
            {children}
          </BlogLink>
        ) : (
          <span key={index}>{children}</span>
        );
      case "block":
        return (
          <BlogPhoto key={index} image={node.image} caption={node.caption} />
        );
      default:
        return null;
    }
  });
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("sr-Latn-RS", {
    dateStyle: "long",
    timeZone: "Europe/Belgrade",
  }).format(new Date(value));
export function BlogArticle({
  post,
  preview = false,
  related,
}: {
  post: BlogPost;
  preview?: boolean;
  related?: ReactNode;
}) {
  return (
    <EditorialPage>
      <div className="break-words [overflow-wrap:anywhere]">
        <nav aria-label="Putanja" className="mb-5 text-sm text-river-700">
          <BlogLink href="/" className="focus-ring rounded-xl underline">
            Početna
          </BlogLink>
          <span aria-hidden> / </span>
          <BlogLink href="/blog" className="focus-ring rounded-xl underline">
            Blog
          </BlogLink>
        </nav>
        {preview ? (
          <aside
            className="mb-6 rounded-xl border border-river-100 bg-river-50 p-5 text-ink"
            aria-label="Pregled nacrta"
          >
            <p className="font-bold">Pregled nacrta — nije javna stranica</p>
            <p className="mt-1 text-sm">
              Prikazane su poslednje sačuvane izmene. Osvežite stranicu nakon
              čuvanja.
            </p>
            <PreviewExit />
          </aside>
        ) : null}
        <EditorialIntro
          eyebrow="Blog · Saveti za ribolovce"
          title={post.title}
          summary={post.excerpt}
        />
        <EditorialFacts
          facts={[
            {
              label: "Autor",
              value: post.author?.name || "Autor nije dostupan",
            },
            {
              label: "Objavljeno",
              value: post.publishedAt ? (
                <time dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt)}
                </time>
              ) : (
                "Nacrt"
              ),
            },
            ...(post.editorialUpdatedAt
              ? [
                  {
                    label: "Dopunjeno",
                    value: (
                      <time dateTime={post.editorialUpdatedAt}>
                        {formatDate(post.editorialUpdatedAt)}
                      </time>
                    ),
                  },
                ]
              : []),
          ]}
        />
        <div className="mx-auto max-w-3xl">
          <BlogPhoto image={post.cover} priority />
          <div className="text-base leading-8 text-ink-800 sm:text-lg">
            {post.body.length ? (
              renderNodes(post.body)
            ) : (
              <p className="my-8">Tekst još nije dodat.</p>
            )}
          </div>
          {post.author?.bio ? (
            <aside className="mt-10 border-t border-sand-200 pt-5">
              <h2 className="font-bold text-ink">
                O autoru: {post.author.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                {post.author.bio}
              </p>
            </aside>
          ) : null}
          <BlogLink
            href="/blog"
            className="focus-ring mt-8 inline-block rounded-xl font-semibold text-river-700 underline"
          >
            Svi članci
          </BlogLink>
        </div>
        {related}
      </div>
    </EditorialPage>
  );
}
