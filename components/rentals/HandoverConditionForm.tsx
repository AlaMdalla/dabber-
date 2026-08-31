"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import { compressImage } from "@/lib/imageCompression";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { RentalHandoverWithPhotos } from "@/lib/supabase/types";

const MAX_PHOTOS = 5;

interface Photo {
  path: string;
  previewUrl: string;
}

interface HandoverConditionFormProps {
  rentalRequestId: string;
  isMedical?: boolean;
  onSubmitted: (handover: RentalHandoverWithPhotos) => void;
}

export default function HandoverConditionForm({
  rentalRequestId,
  isMedical = false,
  onSubmitted,
}: HandoverConditionFormProps) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    setIsUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of files.slice(0, remaining)) {
      try {
        const compressed = await compressImage(file, {
          invalidType: t("form.invalidImageType"),
          tooLarge: t("form.imageTooLarge"),
          prepareFailed: t("form.imagePrepare"),
          compressFailed: t("form.imageCompress"),
        });
        const path = `${rentalRequestId}/${compressed.name}`;
        const { error: uploadError } = await supabase.storage
          .from("rental-condition-images")
          .upload(path, compressed, { contentType: compressed.type });

        if (uploadError) {
          throw new Error(describeError(uploadError));
        }

        setPhotos((current) => [...current, { path, previewUrl: URL.createObjectURL(compressed) }]);
      } catch (uploadError) {
        console.error("[HandoverConditionForm] photo upload failed:", uploadError);
        setError(uploadError instanceof Error ? uploadError.message : describeError(uploadError));
      }
    }

    setIsUploading(false);
  }

  function removePhoto(path: string) {
    setPhotos((current) => current.filter((photo) => photo.path !== path));
  }

  async function handleSubmit() {
    if (photos.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("submit_handover_condition", {
      p_request_id: rentalRequestId,
      p_note: note.trim() || null,
      p_photo_paths: photos.map((photo) => photo.path),
    });

    setIsSubmitting(false);
    if (rpcError || !data) {
      console.error("[HandoverConditionForm] submit failed:", rpcError);
      setError(describeError(rpcError));
      return;
    }

    onSubmitted({ ...data, rental_handover_photos: [] });
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-sm font-semibold text-ink">{t("handover.conditionTitle")}</p>
      <p className="mt-1 text-xs text-muted">
        {t(isMedical ? "handover.conditionHintMedical" : "handover.conditionHint")}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((photo) => (
          <div key={photo.path} className="relative aspect-square overflow-hidden rounded-xl border border-border">
            <Image src={photo.previewUrl} alt="" fill sizes="120px" className="object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(photo.path)}
              aria-label={t("common.remove")}
              className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-subtle text-muted transition-colors hover:bg-border/40">
            <Camera className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">{isUploading ? t("common.saving") : t("handover.addPhoto")}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              disabled={isUploading}
              onChange={handleFiles}
              className="sr-only"
            />
          </label>
        )}
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t(isMedical ? "handover.notePlaceholderMedical" : "handover.notePlaceholder")}
        rows={2}
        maxLength={500}
        className="mt-4 w-full resize-none rounded-xl border border-border bg-subtle px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      <button
        type="button"
        disabled={photos.length === 0 || isSubmitting || isUploading}
        onClick={handleSubmit}
        className="mt-4 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isSubmitting ? t("common.saving") : t("handover.submitCondition")}
      </button>
    </div>
  );
}
