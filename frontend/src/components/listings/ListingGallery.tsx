"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

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
  const selected = images.find((image) => image.id === selectedId) ?? images[0];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-river-100 via-white to-reed/30">
          {selected ? (
            <Image
              src={selected.url}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 820px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-river-700">Fotografija opreme</div>
          )}
        </div>
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedId(image.id)}
              className={`focus-ring relative aspect-square overflow-hidden rounded-md border bg-white ${
                selected?.id === image.id ? "border-river-600 ring-2 ring-river-100" : "border-slate-200"
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
