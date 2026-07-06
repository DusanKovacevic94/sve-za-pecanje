import { ReviewForm } from "@/components/forms/ReviewForm";
import { Badge } from "@/components/ui/Badge";
import type { MyReviews, ReviewItem } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { serverApiFetch } from "@/lib/server-api";

function ReviewCard({ review, direction }: { review: ReviewItem; direction: "received" | "given" }) {
  const person = direction === "received" ? review.reviewer : review.reviewee;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-black">{review.listing?.title ?? "Oglas"}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {direction === "received" ? "Od" : "Za"} {person?.display_name ?? person?.username ?? "korisnika"}
          </p>
        </div>
        <Badge tone="accent">{review.rating}/5</Badge>
      </div>
      {review.comment ? <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{review.comment}</p> : null}
      <p className="mt-3 text-xs font-semibold text-slate-500">{formatDate(review.created_at)}</p>
    </article>
  );
}

export default async function ReviewsPage() {
  const reviews = await serverApiFetch<MyReviews>("/users/me/reviews");

  return (
    <div>
      <h1 className="text-3xl font-black">Ocene</h1>
      <p className="mt-2 text-slate-600">Ocene posle završenih prodaja.</p>

      {reviews.data.pending.length ? (
        <section className="mt-6">
          <h2 className="text-xl font-black">Čekaju vašu ocenu</h2>
          <div className="mt-4 space-y-4">
            {reviews.data.pending.map((item) => (
              <ReviewForm key={`${item.listing.id}-${item.reviewee.id}`} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xl font-black">Primljene ocene</h2>
        <div className="mt-4 space-y-4">
          {reviews.data.received.length ? (
            reviews.data.received.map((review) => <ReviewCard key={review.id} review={review} direction="received" />)
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">Još nemate primljene ocene.</div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black">Date ocene</h2>
        <div className="mt-4 space-y-4">
          {reviews.data.given.length ? (
            reviews.data.given.map((review) => <ReviewCard key={review.id} review={review} direction="given" />)
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">Još niste ostavili ocenu.</div>
          )}
        </div>
      </section>
    </div>
  );
}
