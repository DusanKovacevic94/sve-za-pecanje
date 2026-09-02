"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RatingIcon } from "@/components/icons";
import { apiFetch, type PendingReview, type ReviewItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FieldLabel, Select, Textarea } from "@/components/ui/Field";

export function ReviewForm({ item }: { item: PendingReview }) {
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await apiFetch<ReviewItem>("/reviews", {
        method: "POST",
        body: JSON.stringify({
          listing_id: item.listing.id,
          reviewee_id: item.reviewee.id,
          rating: Number(rating),
          comment: comment.trim() || null,
        })
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Došlo je do greške.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-sand-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-extrabold">{item.listing.title}</h3>
          <p className="mt-1 text-sm text-ink-600">
            Ocenjujete {item.reviewee.display_name ?? item.reviewee.username}
          </p>
        </div>
        <div className="w-full sm:w-28">
          <FieldLabel htmlFor={`rating-${item.listing.id}`}>Ocena</FieldLabel>
          <Select id={`rating-${item.listing.id}`} value={rating} onChange={(event) => setRating(event.target.value)}>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-4">
        <FieldLabel htmlFor={`comment-${item.listing.id}`}>Komentar</FieldLabel>
        <Textarea id={`comment-${item.listing.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1500} />
      </div>
      {message ? <Alert tone="error" className="mt-3">{message}</Alert> : null}
      <Button type="submit" disabled={pending} className="mt-4">
        <RatingIcon size={18} /> Ostavi ocenu
      </Button>
    </form>
  );
}
