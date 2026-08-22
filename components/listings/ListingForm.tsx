"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uniqueSlug } from "@/lib/slugify";
import { describeError } from "@/lib/supabase/errorMessage";
import { categories } from "@/data/categories";
import { governorates } from "@/data/governorates";
import type { Availability, Listing } from "@/lib/supabase/types";

interface ListingFormProps {
  ownerId: string;
  listing?: Listing;
}

const LISTING_IMAGES_PUBLIC_PATH =
  "/storage/v1/object/public/listing-images/";

function getListingImagePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const markerIndex = url.pathname.indexOf(LISTING_IMAGES_PUBLIC_PATH);

    if (markerIndex === -1) return null;

    return decodeURIComponent(
      url.pathname.slice(markerIndex + LISTING_IMAGES_PUBLIC_PATH.length)
    );
  } catch {
    return null;
  }
}

export default function ListingForm({ ownerId, listing }: ListingFormProps) {
  const router = useRouter();
  const isEditing = Boolean(listing);

  const [name, setName] = useState(listing?.name ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [categorySlug, setCategorySlug] = useState(
    listing?.category_slug ?? categories[0]?.slug ?? ""
  );
  const [governorate, setGovernorate] = useState(
    listing?.governorate ?? governorates[0] ?? ""
  );
  const [pricePerDay, setPricePerDay] = useState(
    listing?.price_per_day !== null && listing?.price_per_day !== undefined
      ? String(listing.price_per_day)
      : ""
  );
  const [availability, setAvailability] = useState<Availability>(
    listing?.availability ?? "disponible"
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const supabase = createClient();

    try {
      let imageUrl = listing?.image_url ?? null;

      if (imageFile) {
        const path = `${ownerId}/${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, imageFile);

        if (uploadError) {
          console.error("[ListingForm] image upload failed:", uploadError);
          throw new Error(`Envoi de la photo : ${describeError(uploadError)}`);
        }

        imageUrl = supabase.storage.from("listing-images").getPublicUrl(path)
          .data.publicUrl;
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category_slug: categorySlug,
        governorate,
        price_per_day: pricePerDay ? Number(pricePerDay) : null,
        availability,
        image_url: imageUrl,
      };

      if (isEditing && listing) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", listing.id);

        if (updateError) {
          console.error("[ListingForm] update failed:", updateError);
          throw new Error(`Mise à jour : ${describeError(updateError)}`);
        }

        if (imageFile && listing.image_url && listing.image_url !== imageUrl) {
          const previousImagePath = getListingImagePath(listing.image_url);

          if (previousImagePath) {
            const { error: removeError } = await supabase.storage
              .from("listing-images")
              .remove([previousImagePath]);

            if (removeError) {
              // The listing already points to the new image, so do not fail the
              // saved update if cleanup of the old file is unsuccessful.
              console.warn(
                "[ListingForm] old image cleanup failed:",
                removeError
              );
            }
          }
        }

        router.push(`/listings/${listing.slug}`);
      } else {
        const slug = uniqueSlug(name);
        const { error: insertError } = await supabase
          .from("listings")
          .insert({ ...payload, slug, owner_id: ownerId });

        if (insertError) {
          console.error("[ListingForm] insert failed:", insertError);
          throw new Error(`Création de l'annonce : ${describeError(insertError)}`);
        }
        router.push(`/listings/${slug}`);
      }

      router.refresh();
    } catch (err) {
      console.error("[ListingForm] submit failed:", err);
      setError(describeError(err));
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-semibold text-ink">
          Nom du produit
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Vidéoprojecteur Full HD"
          className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-xs font-semibold text-ink"
        >
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="État, accessoires inclus, conditions de location…"
          className="rounded-xl border border-border px-3.5 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="category"
            className="text-xs font-semibold text-ink"
          >
            Catégorie
          </label>
          <select
            id="category"
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
            className="h-12 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="governorate"
            className="text-xs font-semibold text-ink"
          >
            Gouvernorat
          </label>
          <select
            id="governorate"
            value={governorate}
            onChange={(event) => setGovernorate(event.target.value)}
            className="h-12 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {governorates.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="price" className="text-xs font-semibold text-ink">
            Prix par jour (DT)
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.5"
            value={pricePerDay}
            onChange={(event) => setPricePerDay(event.target.value)}
            placeholder="Laisser vide pour « prix sur demande »"
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="availability"
            className="text-xs font-semibold text-ink"
          >
            Disponibilité
          </label>
          <select
            id="availability"
            value={availability}
            onChange={(event) =>
              setAvailability(event.target.value as Availability)
            }
            className="h-12 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="disponible">Disponible</option>
            <option value="a-confirmer">À confirmer</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-xs font-semibold text-ink">
          Photo {isEditing && listing?.image_url ? "(optionnel)" : ""}
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          className="rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-subtle file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {isSaving
          ? "Enregistrement…"
          : isEditing
            ? "Enregistrer les modifications"
            : "Publier l'annonce"}
      </button>
    </form>
  );
}
