"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CameraIcon,
  DeleteIcon,
  RatingIcon,
} from "@/components/icons";
import { apiFetch, type ListingDetail } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FieldLabel, Input } from "@/components/ui/Field";

type ListingImage = ListingDetail["images"][number];
const maxListingImages = 10;

export function ListingImageManager({
  sectionId,
  listingId,
  initialImages,
  ensureListingId,
  onImagesChange
}: {
  sectionId?: string;
  listingId?: string;
  initialImages: ListingImage[];
  ensureListingId?: () => Promise<string | null>;
  onImagesChange?: (images: ListingImage[]) => void;
}) {
  const router = useRouter();
  const [images, setImages] = useState(() => [...initialImages].sort((a, b) => a.sort_order - b.sort_order));
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [resolvedListingId, setResolvedListingId] = useState(listingId);

  useEffect(() => {
    const next = [...initialImages].sort((a, b) => a.sort_order - b.sort_order);
    setImages(next);
  }, [initialImages]);

  useEffect(() => {
    if (listingId) setResolvedListingId(listingId);
  }, [listingId]);

  function updateImages(next: ListingImage[]) {
    setImages(next);
    onImagesChange?.(next);
  }

  async function uploadImages(files: File[]) {
    if (!files.length) return;
    setMessage(null);
    setIsUploading(true);
    const availableSlots = Math.max(0, maxListingImages - images.length);
    const queuedFiles = files.slice(0, availableSlots);
    if (!queuedFiles.length) {
      setMessage(`Oglas može imati najviše ${maxListingImages} fotografija.`);
      setIsUploading(false);
      return;
    }
    setUploadProgress({ current: 0, total: queuedFiles.length });
    const failures: string[] = [];
    let uploaded = 0;
    try {
      const targetListingId = resolvedListingId ?? await ensureListingId?.();
      if (!targetListingId) {
        throw new Error("Nacrt nije sačuvan. Pokušajte ponovo.");
      }
      setResolvedListingId(targetListingId);
      let nextImages = images;
      for (const [index, file] of queuedFiles.entries()) {
        setUploadProgress({ current: index + 1, total: queuedFiles.length });
        try {
          const formData = new FormData();
          formData.append("upload", file);
          const response = await apiFetch<ListingImage>(`/listings/${targetListingId}/images`, {
            method: "POST",
            body: formData
          });
          nextImages = [...nextImages, response.data].sort((a, b) => a.sort_order - b.sort_order);
          updateImages(nextImages);
          uploaded += 1;
        } catch (error) {
          failures.push(error instanceof Error ? error.message : `Fotografija „${file.name}” nije otpremljena.`);
        }
      }
      if (files.length > queuedFiles.length) {
        failures.push(`Izabrano je više od dozvoljenih ${maxListingImages} fotografija.`);
      }
      if (failures.length) {
        setMessage(
          uploaded
            ? `${uploaded} fotografija je otpremljeno. ${failures[0]}`
            : failures[0]
        );
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fotografije nisu otpremljene.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  async function deleteImage(imageId: string) {
    const activeListingId = resolvedListingId ?? listingId;
    if (!activeListingId) return;
    if (!window.confirm("Obrisati sliku?")) return;
    setMessage(null);
    try {
      await apiFetch<{ message: string }>(`/listings/${activeListingId}/images/${imageId}`, { method: "DELETE" });
      updateImages(images.filter((image) => image.id !== imageId));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Slika nije obrisana.");
    }
  }

  async function setCover(imageId: string) {
    const activeListingId = resolvedListingId ?? listingId;
    if (!activeListingId) return;
    setMessage(null);
    try {
      await apiFetch<ListingImage>(`/listings/${activeListingId}/images/${imageId}/cover`, { method: "POST" });
      updateImages(images.map((image) => ({ ...image, is_cover: image.id === imageId })));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Naslovna slika nije promenjena.");
    }
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const activeListingId = resolvedListingId ?? listingId;
    if (!activeListingId) return;
    const index = images.findIndex((image) => image.id === imageId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= images.length) return;
    const next = [...images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateImages(next.map((image, sort_order) => ({ ...image, sort_order })));
    setMessage(null);
    try {
      const response = await apiFetch<ListingImage[]>(`/listings/${activeListingId}/images/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ image_ids: next.map((image) => image.id) })
      });
      updateImages(response.data);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Redosled nije sačuvan.");
    }
  }

  return (
    <section
      id={sectionId}
      tabIndex={-1}
      className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-soft"
    >
      <h2 className="text-xl font-black">5. Slike</h2>
      <p className="mt-1 text-sm text-slate-600">
        Dodajte do {maxListingImages} jasnih fotografija. Prva fotografija je naslovna dok ne izaberete drugu.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <FieldLabel htmlFor="listing-image">Dodaj sliku</FieldLabel>
          <Input
            id="listing-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={isUploading}
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              void uploadImages(files);
            }}
          />
          <p className="mt-1 text-xs text-slate-500">Možete izabrati više fotografija odjednom.</p>
        </div>
        <div className="min-w-0">
          <FieldLabel htmlFor="listing-camera">Fotografiši opremu</FieldLabel>
          <label
            htmlFor="listing-camera"
            className="focus-within:ring-2 focus-within:ring-river-500 focus-within:ring-offset-2 mt-1 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm font-bold text-ink hover:border-river-300"
          >
            <CameraIcon size={18} /> Otvori kameru
            <input
              id="listing-camera"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={isUploading}
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                void uploadImages(files);
              }}
            />
          </label>
        </div>
      </div>
      {uploadProgress ? (
        <p className="mt-3 text-sm font-semibold text-river-800" role="status" aria-live="polite">
          Otpremanje fotografije {uploadProgress.current} od {uploadProgress.total}…
        </p>
      ) : null}
      {message ? <Alert tone="error" className="mt-3">{message}</Alert> : null}
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
            <p className="mt-3 text-sm font-bold text-ink">
              {index + 1}. {image.is_cover ? "Naslovna fotografija" : "Fotografija oglasa"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCover(image.id)}
                disabled={image.is_cover || isUploading}
                title="Postavi kao naslovnu"
                aria-label="Postavi kao naslovnu"
              >
                <RatingIcon size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => moveImage(image.id, -1)}
                disabled={index === 0 || isUploading}
                title="Pomeri gore"
                aria-label="Pomeri gore"
              >
                <ArrowUpIcon size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => moveImage(image.id, 1)}
                disabled={index === images.length - 1 || isUploading}
                title="Pomeri dole"
                aria-label="Pomeri dole"
              >
                <ArrowDownIcon size={18} />
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => deleteImage(image.id)}
                disabled={isUploading}
                title="Obriši sliku"
                aria-label="Obriši sliku"
              >
                <DeleteIcon size={18} />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
