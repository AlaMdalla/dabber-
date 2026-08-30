"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import type { Profile } from "@/lib/supabase/types";
import { useI18n } from "@/components/i18n/LocaleProvider";

interface ProfileFormProps {
  profile: Profile;
}

const AVATAR_IMAGES_PUBLIC_PATH = "/storage/v1/object/public/avatar-images/";

const COUNTRY_CODES = [
  { code: "+216", label: "Tunisie" },
  { code: "+213", label: "Algérie" },
  { code: "+218", label: "Libye" },
  { code: "+212", label: "Maroc" },
  { code: "+33", label: "France" },
  { code: "+39", label: "Italie" },
  { code: "+49", label: "Allemagne" },
  { code: "+32", label: "Belgique" },
] as const;

function splitWhatsappNumber(value: string | null) {
  const compact = value?.replace(/[\s()-]/g, "") ?? "";
  const country = COUNTRY_CODES.find(({ code }) => compact.startsWith(code));

  return {
    countryCode: country?.code ?? "+216",
    localNumber: country ? compact.slice(country.code.length) : compact.replace(/^\+/, ""),
  };
}

function getAvatarImagePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const markerIndex = url.pathname.indexOf(AVATAR_IMAGES_PUBLIC_PATH);

    if (markerIndex === -1) return null;

    return decodeURIComponent(
      url.pathname.slice(markerIndex + AVATAR_IMAGES_PUBLIC_PATH.length)
    );
  } catch {
    return null;
  }
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const initialWhatsapp = splitWhatsappNumber(profile.whatsapp_number);
  const [countryCode, setCountryCode] = useState(initialWhatsapp.countryCode);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsapp.localNumber);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = fullName.trim() || profile.full_name || t("common.user");
  const avatarUrl = avatarPreview ?? profile.avatar_url;

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
    setAvatarPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("idle");
    setErrorMessage(null);

    const localWhatsapp = whatsappNumber.replace(/\D/g, "");
    const normalizedWhatsapp = localWhatsapp ? `${countryCode}${localWhatsapp}` : "";
    if (normalizedWhatsapp && !/^\+[1-9]\d{7,14}$/.test(normalizedWhatsapp)) {
      setIsSaving(false);
      setErrorMessage(t("account.whatsappInvalid"));
      setStatus("error");
      return;
    }

    const supabase = createClient();

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const path = `${profile.id}/${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("avatar-images")
          .upload(path, avatarFile);

        if (uploadError) {
          console.error("[ProfileForm] avatar upload failed:", uploadError);
          throw new Error(t("account.photoUploadError", { error: describeError(uploadError) }));
        }

        avatarUrl = supabase.storage.from("avatar-images").getPublicUrl(path)
          .data.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          whatsapp_number: normalizedWhatsapp || null,
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id);

      if (error) {
        console.error("[ProfileForm] update failed:", error);
        throw new Error(describeError(error));
      }

      if (avatarFile && profile.avatar_url && profile.avatar_url !== avatarUrl) {
        const previousAvatarPath = getAvatarImagePath(profile.avatar_url);

        if (previousAvatarPath) {
          const { error: removeError } = await supabase.storage
            .from("avatar-images")
            .remove([previousAvatarPath]);

          if (removeError) {
            console.warn("[ProfileForm] old avatar cleanup failed:", removeError);
          }
        }
      }

      setAvatarFile(null);
      setStatus("saved");
      window.dispatchEvent(new Event("dabber:profile-updated"));
      router.refresh();
    } catch (err) {
      console.error("[ProfileForm] submit failed:", err);
      setErrorMessage(describeError(err));
      setStatus("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <UserIcon className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="avatar"
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-subtle focus-within:outline-none focus-within:ring-2 focus-within:ring-accent"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {avatarUrl ? t("account.changePhoto") : t("account.addPhoto")}
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="sr-only"
          />
          {avatarFile && (
            <p className="text-xs text-muted">{avatarFile.name}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-xs font-semibold text-ink">
          {t("auth.displayName")}
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t("account.namePlaceholder")}
          className="h-12 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="whatsapp_number" className="text-xs font-semibold text-ink">
          {t("account.whatsapp")}
        </label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value as typeof countryCode)}
            aria-label={`${t("account.whatsapp")} — country code`}
            className="h-12 max-w-40 rounded-xl border border-border bg-white px-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {COUNTRY_CODES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label} {country.code}
              </option>
            ))}
          </select>
          <input
            id="whatsapp_number"
            name="whatsapp_number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
            placeholder="20 123 456"
            aria-describedby="whatsapp-help"
            className="h-12 min-w-0 flex-1 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <p id="whatsapp-help" className="text-xs text-muted">
          {t("account.whatsappHelp")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {isSaving ? t("common.saving") : t("common.save")}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium text-green-700">
            {t("account.updated")}
          </span>
        )}
        {status === "error" && (
          <span className="text-sm font-medium text-red-600">
            {errorMessage}
          </span>
        )}
      </div>
    </form>
  );
}
