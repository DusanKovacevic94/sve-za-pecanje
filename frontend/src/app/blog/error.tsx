"use client";
import { BlogLink } from "@/components/blog/BlogLink";
import { PageTitle } from "@/components/ui/Primitives";
export default function BlogError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <PageTitle>Blog trenutno nije dostupan</PageTitle>
      <p className="mt-4 text-ink-600">
        Pokušajte ponovo za nekoliko trenutaka. Oglase možete da pregledate i
        dalje.
      </p>
      <button
        onClick={reset}
        className="focus-ring mt-6 rounded-xl bg-river-700 px-5 py-3 font-semibold text-white"
      >
        Pokušaj ponovo
      </button>
      <BlogLink
        href="/oglasi"
        className="focus-ring ml-5 inline-block rounded-xl text-river-700 underline"
      >
        Pogledaj oglase
      </BlogLink>
    </section>
  );
}
