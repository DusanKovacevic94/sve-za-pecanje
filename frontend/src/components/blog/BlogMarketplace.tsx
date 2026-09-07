import { ListingCard } from "@/components/listings/ListingCard";
import { SectionHeading } from "@/components/ui/Primitives";
import type { BlogMarketplace as Marketplace } from "@/lib/blog-marketplace";
import { BlogLink } from "./BlogLink";

export function BlogMarketplace({ data }: { data: Marketplace }) {
  if (!data.category && !data.unavailable) return null;
  return (
    <section
      aria-labelledby="blog-equipment"
      className="mt-10 border-t border-sand-200 pt-8"
      data-blog-marketplace
    >
      <SectionHeading as="h2" id="blog-equipment">
        Povezani oglasi
      </SectionHeading>
      {data.category ? (
        <BlogLink
          href={`/kategorije/${data.category.slug}`}
          className="focus-ring mt-3 inline-block rounded-xl font-semibold text-river-700 underline underline-offset-4"
        >
          Pogledajte kategoriju: {data.category.name_sr}
        </BlogLink>
      ) : null}
      {data.unavailable ? (
        <p className="mt-4 text-sm leading-6 text-ink-600">
          Povezani oglasi trenutno nisu dostupni. Pokušajte ponovo kasnije.
        </p>
      ) : data.listings.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink-600">
          Trenutno nema dostupnih oglasa za ovu kategoriju. Ponudu možete
          proveriti kasnije.
        </p>
      )}
    </section>
  );
}
