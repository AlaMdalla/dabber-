"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uniqueSlug } from "@/lib/slugify";
import { describeError } from "@/lib/supabase/errorMessage";
import { categories } from "@/data/categories";
import { governorates } from "@/data/governorates";
import type { Availability, Listing, ListingImage } from "@/lib/supabase/types";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizePath } from "@/lib/i18n/config";
import { localizeCategory } from "@/lib/i18n/categories";

interface ListingFormProps {
  ownerId: string;
  listing?: Listing;
  listingImages?: ListingImage[];
}

const LISTING_IMAGES_PUBLIC_PATH =
  "/storage/v1/object/public/listing-images/";
const MAX_LISTING_IMAGES = 5;
const MAX_SOURCE_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

async function compressListingImage(file: File, t: (key: string) => string) {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error(t("form.invalidImageType"));
  }
  if (file.size > MAX_SOURCE_IMAGE_SIZE) {
    throw new Error(t("form.imageTooLarge"));
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error(t("form.imagePrepare"));
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );

  if (!blob) {
    throw new Error(t("form.imageCompress"));
  }

  return new File([blob], `${crypto.randomUUID()}.webp`, {
    type: "image/webp",
  });
}

export default function ListingForm({
  ownerId,
  listing,
  listingImages = [],
}: ListingFormProps) {
  const { locale, t } = useI18n();
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
  const initialImages = listingImages.length > 0
    ? [...listingImages].sort((a, b) => a.position - b.position)
    : listing?.image_url
      ? [{
          id: `legacy-${listing.id}`,
          listing_id: listing.id,
          image_url: listing.image_url,
          storage_path: getListingImagePath(listing.image_url),
          position: 0,
          created_at: listing.created_at,
        }]
      : [];
  const [existingImages, setExistingImages] = useState<ListingImage[]>(initialImages);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const availableSlots = MAX_LISTING_IMAGES - existingImages.length - imageFiles.length;

    if (selectedFiles.length > availableSlots) {
      setError(t("form.maxPhotos", { max: MAX_LISTING_IMAGES }));
      event.target.value = "";
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !SUPPORTED_IMAGE_TYPES.has(file.type) || file.size > MAX_SOURCE_IMAGE_SIZE,
    );
    if (invalidFile) {
      setError(t("form.invalidImages"));
      event.target.value = "";
      return;
    }

    setError(null);
    setImageFiles((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    const uploadedPaths: string[] = [];
    let destinationSlug = listing?.slug ?? "";
    let createdListingId: string | null = null;
    let shouldRestoreExistingGallery = false;

    try {
      const listingId = listing?.id ?? crypto.randomUUID();
      const uploadedImages: Array<{ image_url: string; storage_path: string }> = [];

      for (const imageFile of imageFiles) {
        const compressedImage = await compressListingImage(imageFile, t);
        const path = `${ownerId}/${listingId}/${compressedImage.name}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, compressedImage, {
            cacheControl: "31536000",
            contentType: compressedImage.type,
          });

        if (uploadError) {
          console.error("[ListingForm] image upload failed:", uploadError);
          throw new Error(t("form.uploadPhoto", { error: describeError(uploadError) }));
        }

        uploadedPaths.push(path);
        uploadedImages.push({
          image_url: supabase.storage.from("listing-images").getPublicUrl(path)
            .data.publicUrl,
          storage_path: path,
        });
      }

      const finalImages = [
        ...existingImages.map((image) => ({
          image_url: image.image_url,
          storage_path: image.storage_path,
        })),
        ...uploadedImages,
      ];

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category_slug: categorySlug,
        governorate,
        price_per_day: pricePerDay ? Number(pricePerDay) : null,
        availability,
        image_url: finalImages[0]?.image_url ?? null,
      };

      if (isEditing && listing) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", listing.id);

        if (updateError) {
          console.error("[ListingForm] update failed:", updateError);
          throw new Error(t("form.update", { error: describeError(updateError) }));
        }

      } else {
        const slug = uniqueSlug(name);
        destinationSlug = slug;
        const { error: insertError } = await supabase
          .from("listings")
          .insert({ ...payload, id: listingId, slug, owner_id: ownerId });

        if (insertError) {
          console.error("[ListingForm] insert failed:", insertError);
          throw new Error(t("form.create", { error: describeError(insertError) }));
        }
        createdListingId = listingId;
      }

      const { error: clearImagesError } = await supabase
        .from("listing_images")
        .delete()
        .eq("listing_id", listingId);

      if (clearImagesError) {
        throw new Error(t("form.updatePhotos", { error: describeError(clearImagesError) }));
      }
      shouldRestoreExistingGallery = Boolean(listing);

      if (finalImages.length > 0) {
        const { error: imageRowsError } = await supabase
          .from("listing_images")
          .insert(finalImages.map((image, position) => ({
            listing_id: listingId,
            image_url: image.image_url,
            storage_path: image.storage_path,
            position,
          })));

        if (imageRowsError) {
          throw new Error(t("form.updatePhotos", { error: describeError(imageRowsError) }));
        }
      }
      shouldRestoreExistingGallery = false;

      const keptUrls = new Set(existingImages.map((image) => image.image_url));
      const removedPaths = initialImages
        .filter((image) => !keptUrls.has(image.image_url))
        .map((image) => image.storage_path ?? getListingImagePath(image.image_url))
        .filter((path): path is string => Boolean(path));

      if (removedPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("listing-images")
          .remove(removedPaths);
        if (removeError) {
          console.warn("[ListingForm] removed image cleanup failed:", removeError);
        }
      }

      router.push(localizePath(`/listings/${destinationSlug}`, locale));

      router.refresh();
    } catch (err) {
      if (listing && shouldRestoreExistingGallery) {
        const originalRows = initialImages.map((image, position) => ({
          listing_id: listing.id,
          image_url: image.image_url,
          storage_path: image.storage_path,
          position,
        }));
        const { error: coverRollbackError } = await supabase
          .from("listings")
          .update({ image_url: listing.image_url })
          .eq("id", listing.id);
        const { error: galleryRollbackError } = originalRows.length > 0
          ? await supabase.from("listing_images").insert(originalRows)
          : { error: null };

        if (coverRollbackError || galleryRollbackError) {
          console.warn(
            "[ListingForm] gallery rollback failed:",
            coverRollbackError ?? galleryRollbackError,
          );
        }
      }
      if (createdListingId) {
        const { error: rollbackError } = await supabase
          .from("listings")
          .delete()
          .eq("id", createdListingId);
        if (rollbackError) {
          console.warn("[ListingForm] failed listing rollback failed:", rollbackError);
        }
      }
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from("listing-images")
          .remove(uploadedPaths);
        if (cleanupError) {
          console.warn("[ListingForm] failed upload cleanup failed:", cleanupError);
        }
      }
      console.error("[ListingForm] submit failed:", err);
      setError(describeError(err));
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-semibold text-ink">
          {t("form.name")}
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("form.namePlaceholder")}
          className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-xs font-semibold text-ink"
        >
          {t("listing.description")}
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("form.descriptionPlaceholder")}
          className="rounded-xl border border-border px-3.5 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="category"
            className="text-xs font-semibold text-ink"
          >
            {t("form.category")}
          </label>
          <select
            id="category"
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
            className="h-12 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {localizeCategory(category, t).name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="governorate"
            className="text-xs font-semibold text-ink"
          >
            {t("form.governorate")}
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
            {t("form.price")}
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.5"
            value={pricePerDay}
            onChange={(event) => setPricePerDay(event.target.value)}
            placeholder={t("form.pricePlaceholder")}
            className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="availability"
            className="text-xs font-semibold text-ink"
          >
            {t("form.availability")}
          </label>
          <select
            id="availability"
            value={availability}
            onChange={(event) =>
              setAvailability(event.target.value as Availability)
            }
            className="h-12 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="disponible">{t("common.available")}</option>
            <option value="a-confirmer">{t("common.toConfirm")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="images" className="text-xs font-semibold text-ink">
          {t("form.photos", { count: existingImages.length + imageFiles.length, max: MAX_LISTING_IMAGES })}
        </label>
        <input
          id="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={existingImages.length + imageFiles.length >= MAX_LISTING_IMAGES}
          onChange={handleImageSelection}
          className="rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink file:me-3 file:rounded-lg file:border-0 file:bg-subtle file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <p className="text-xs text-muted">
          {t("form.photosHelp")}
        </p>

        {(existingImages.length > 0 || imageFiles.length > 0) && (
          <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingImages.map((image, index) => (
              <div key={image.id} className="rounded-xl border border-border p-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-subtle">
                  <Image src={image.image_url} alt="" fill sizes="180px" className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => setExistingImages((current) => current.filter((item) => item.id !== image.id))}
                  className="mt-2 w-full text-xs font-medium text-red-600"
                >
                  {t("common.delete")}{index === 0 ? ` (${t("form.cover")})` : ""}
                </button>
              </div>
            ))}
            {imageFiles.map((file, index) => (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="rounded-xl border border-border p-2">
                <p className="truncate text-xs font-medium text-ink">{file.name}</p>
                <p className="mt-1 text-xs text-muted">{t("form.newPhoto")}</p>
                <button
                  type="button"
                  onClick={() => setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="mt-2 text-xs font-medium text-red-600"
                >
                  {t("form.remove")}
                </button>
              </div>
            ))}
          </div>
        )}
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
          ? t("common.saving")
          : isEditing
            ? t("form.saveChanges")
            : t("form.publish")}
      </button>
    </form>
  );
}
