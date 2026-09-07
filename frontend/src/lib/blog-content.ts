// Deliberately small, defensive public contract. Never spread CMS records into props.
export type BlogImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
};
export type BlogNode = {
  type: string;
  text?: string;
  format?: number;
  tag?: string;
  listType?: string;
  href?: string;
  image?: BlogImage;
  caption?: string;
  children: BlogNode[];
};
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  modifiedAt: string;
  editorialUpdatedAt: string;
  author?: { name: string; bio: string };
  cover?: BlogImage;
  body: BlogNode[];
  marketplaceCategorySlug?: string;
};
export const blogSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, limit = 10000) =>
  typeof value === "string" ? value.slice(0, limit) : "";
const date = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : "";

export function safeBlogLink(value: unknown): string | undefined {
  if (typeof value !== "string" || /[\s\\\u0000-\u001f\u007f]/.test(value))
    return;
  if (/^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) return value;
  try {
    if (["http:", "https:", "mailto:"].includes(new URL(value).protocol))
      return value;
  } catch {
    /* Invalid URL. */
  }
}

export function mapImage(value: unknown): BlogImage | undefined {
  const image = record(value);
  try {
    const base = new URL(
      process.env.CMS_S3_PUBLIC_URL || "http://localhost:9000/svezapecanje-cms",
    );
    const url = new URL(String(image.url));
    if (
      url.origin !== base.origin ||
      !url.pathname.startsWith(`${base.pathname.replace(/\/$/, "")}/media/`) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return;
    const width = Number(image.width),
      height = Number(image.height);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 10000 ||
      height > 10000
    )
      return;
    return {
      url: url.href,
      width,
      height,
      alt: text(image.alt, 300),
      caption: text(image.caption, 600),
      credit: text(image.credit, 300),
    };
  } catch {
    return;
  }
}

export function mapBody(value: unknown): BlogNode[] {
  let count = 0;
  const visit = (value: unknown, depth: number): BlogNode[] => {
    if (depth > 32 || ++count > 10000) return [];
    const node = record(value),
      fields = record(node.fields),
      type = String(node.type);
    if (
      ![
        "root",
        "paragraph",
        "heading",
        "text",
        "linebreak",
        "list",
        "listitem",
        "quote",
        "link",
        "block",
      ].includes(type)
    )
      return [];
    const children = Array.isArray(node.children)
      ? node.children.flatMap((child) => visit(child, depth + 1))
      : [];
    return [
      {
        type,
        children,
        text: text(node.text),
        format: Number(node.format) & 3,
        tag: node.tag === "h3" ? "h3" : "h2",
        listType: node.listType === "number" ? "number" : "bullet",
        href:
          fields.linkType === "custom" ? safeBlogLink(fields.url) : undefined,
        image:
          fields.blockType === "image" ? mapImage(fields.image) : undefined,
        caption: text(fields.caption, 600),
      },
    ];
  };
  const nodes = visit(record(value).root, 0);
  return nodes[0]?.children.length ? nodes : [];
}

export function mapPost(value: unknown, preview = false): BlogPost {
  const post = record(value),
    author = record(post.author);
  const slug = text(post.slug, 180),
    publishedAt = date(post.firstPublishedAt);
  if (
    !post.id ||
    (!preview &&
      (post._status !== "published" ||
        !blogSlug.test(slug) ||
        !publishedAt ||
        !text(post.title)))
  )
    throw new Error("Invalid CMS article response");
  const editorialUpdatedAt = date(post.substantiveUpdatedAt);
  return {
    id: String(post.id),
    slug,
    title: text(post.title, 180) || "Članak bez naslova",
    excerpt: text(post.excerpt, 400),
    seoTitle: text(post.seoTitle, 70) || text(post.title, 180),
    seoDescription: text(post.seoDescription, 180) || text(post.excerpt, 180),
    publishedAt,
    modifiedAt: date(post.updatedAt) || publishedAt,
    editorialUpdatedAt:
      editorialUpdatedAt > publishedAt ? editorialUpdatedAt : "",
    author:
      typeof author.name === "string"
        ? { name: text(author.name, 120), bio: text(author.bio, 600) }
        : undefined,
    cover: mapImage(post.coverImage),
    body: mapBody(post.body),
    marketplaceCategorySlug:
      typeof post.marketplaceCategorySlug === "string" &&
      post.marketplaceCategorySlug.length <= 180 &&
      blogSlug.test(post.marketplaceCategorySlug)
        ? post.marketplaceCategorySlug
        : undefined,
  };
}

export const blogURL = (path: string) =>
  new URL(path, process.env.NEXT_PUBLIC_APP_URL || "https://svezapecanje.rs")
    .href;
export const jsonLD = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
