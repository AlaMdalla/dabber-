"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { ListingImage } from "@/lib/supabase/types";

interface ListingGalleryProps {
  images: ListingImage[];
  listingName: string;
}

export default function ListingGallery({ images, listingName }: ListingGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex] ?? images[0];

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-subtle">
        {selected ? (
          <Image
            src={selected.image_url}
            alt={`${listingName} — photo ${selectedIndex + 1}`}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <ImageOff className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Photos de l’annonce">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Afficher la photo ${index + 1}`}
              aria-pressed={index === selectedIndex}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                index === selectedIndex ? "border-ink" : "border-transparent"
              }`}
            >
              <Image
                src={image.image_url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
