import { BlogLink } from "@/components/blog/BlogLink";
import { PageTitle } from "@/components/ui/Primitives";
export default function BlogNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <PageTitle>Članak nije dostupan</PageTitle>
      <p className="mt-4 text-ink-600">
        Ova stranica ne postoji ili članak više nije objavljen.
      </p>
      <BlogLink
        href="/blog"
        className="focus-ring mt-6 inline-block rounded-xl text-river-700 underline"
      >
        Svi članci
      </BlogLink>
    </section>
  );
}
