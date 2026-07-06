"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { apiFetch, type ListingDetail } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";

type ListingImage = ListingDetail["images"][number];

export function ListingImageManager({
  listingId,
  initialImages
}: {
  listingId: string;
  initialImages: ListingImage[];
}) {
  const router = useRouter();
  const [images, setImages] = useState(() => [...initialImages].sort((a, b) => a.sort_order - b.sort_order));
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("upload", file);
      const response = await apiFetch<ListingImage>(`/listings/${listingId}/images`, {
        method: "POST",
        body: formData
      });
      setImages((current) => [...current, response.data].sort((a, b) => a.sort_order - b.sort_order));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Slika nije uploadovana.");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteImage(imageId: string) {
    if (!window.confirm("Obrisati sliku?")) return;
    setMessage(null);
    try {
      await apiFetch<{ message: string }>(`/listings/${listingId}/images/${imageId}`, { method: "DELETE" });
      setImages((current) => current.filter((image) => image.id !== imageId));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Slika nije obrisana.");
    }
  }

  async function setCover(imageId: string) {
    setMessage(null);
    try {
      await apiFetch<ListingImage>(`/listings/${listingId}/images/${imageId}/cover`, { method: "POST" });
      setImages((current) => current.map((image) => ({ ...image, is_cover: image.id === imageId })));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Naslovna slika nije promenjena.");
    }
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const index = images.findIndex((image) => image.id === imageId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= images.length) return;
    const next = [...images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setImages(next.map((image, sort_order) => ({ ...image, sort_order })));
    setMessage(null);
    try {
      const response = await apiFetch<ListingImage[]>(`/listings/${listingId}/images/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ image_ids: next.map((image) => image.id) })
      });
      setImages(response.data);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Redosled nije sačuvan.");
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-black">5. Slike</h2>
      <div className="mt-4">
        <div>
          <FieldLabel htmlFor="listing-image">Dodaj sliku</FieldLabel>
          <Input
            id="listing-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading}
            onChange={(event) => uploadImage(event.target.files?.[0])}
          />
        </div>
      </div>
      {message ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {images.map((image, index) => (
          <article key={image.id} className="rounded-lg border border-slate-200 p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
              <Image src={image.url} alt={`Slika ${index + 1}`} fill sizes="360px" className="object-cover" />
              {image.is_cover ? (
                <span className="absolute left-2 top-2 rounded-full bg-river-600 px-2.5 py-1 text-xs font-semibold text-white">
                  Naslovna
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCover(image.id)}
                title="Postavi kao naslovnu"
                aria-label="Postavi kao naslovnu"
              >
                <Star size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => moveImage(image.id, -1)}
                title="Pomeri gore"
                aria-label="Pomeri gore"
              >
                <ArrowUp size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => moveImage(image.id, 1)}
                title="Pomeri dole"
                aria-label="Pomeri dole"
              >
                <ArrowDown size={18} />
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => deleteImage(image.id)}
                title="Obriši sliku"
                aria-label="Obriši sliku"
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
