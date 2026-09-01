"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CameraIcon,
  DeleteIcon,
  EditIcon,
} from "@/components/icons";
import type { ListingCard } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function DraftListingCard({ listing }: { listing: ListingCard }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function deleteDraft() {
    if (!window.confirm("Trajno obrisati ovaj nacrt i njegove fotografije?")) return;
    setDeleting(true);
    setMessage(null);
    try {
      await apiFetch(`/listings/drafts/${listing.id}`, { method: "DELETE" });
      if (window.localStorage.getItem("szp-active-listing-draft") === listing.id) {
        window.localStorage.removeItem("szp-active-listing-draft");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nacrt nije obrisan.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-dashed border-river-300 bg-white shadow-soft">
      <div className="grid gap-4 p-4 sm:grid-cols-[8rem_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-river-50">
          {listing.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-river-600">
              <CameraIcon size={32} />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-river-700">Nacrt</p>
          <h3 className="mt-1 text-lg font-black">{listing.title || "Oglas bez naslova"}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Poslednji put sačuvano: {formatDate(listing.updated_at)}
          </p>
          {listing.draft_expires_soon && listing.draft_expires_at ? (
            <Alert tone="warning" className="mt-2 py-2 text-xs">
              Nacrt će biti obrisan {formatDate(listing.draft_expires_at)} ako ga ne izmenite.
            </Alert>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
        <Button href={`/postavi-oglas?draft=${listing.id}`} className="flex-1">
          <EditIcon size={16} /> Nastavi uređivanje
        </Button>
        <Button type="button" variant="danger" disabled={deleting} onClick={deleteDraft}>
          <DeleteIcon size={16} /> Obriši
        </Button>
      </div>
      {message ? <Alert tone="error" className="mx-4 mb-4">{message}</Alert> : null}
    </article>
  );
}
