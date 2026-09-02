"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { CameraIcon } from "@/components/icons";
import type { ListingDetail } from "@/lib/api";

export function ListingGallery({ listing }: { listing: ListingDetail }) {
  const images = useMemo(
    () =>
      [...listing.images].sort((left, right) => {
        if (left.is_cover !== right.is_cover) return left.is_cover ? -1 : 1;
        return left.sort_order - right.sort_order;
      }),
    [listing.images]
  );
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? "");
  const [loadedId, setLoadedId] = useState(images[0]?.id ?? "");
  const selected = images.find((image) => image.id === selectedId) ?? images[0];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-soft">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-river-50 via-white to-reed-100">
          {selected ? (
            <Image
              src={selected.url}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 820px, 100vw"
              className={`object-cover motion-safe:transition-opacity motion-safe:duration-300 ${loadedId === selected.id ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setLoadedId(selected.id)}
              priority
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-river-700">
              <CameraIcon size={32} />
              Fotografija opreme
            </div>
          )}
        </div>
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setSelectedId(image.id);
                setLoadedId("");
              }}
              className={`focus-ring relative aspect-square overflow-hidden rounded-xl border bg-white ${
                selected?.id === image.id ? "border-river-600 ring-2 ring-river-100" : "border-sand-200"
              }`}
              aria-label={`Prikaži sliku ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={`${listing.title} ${index + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
