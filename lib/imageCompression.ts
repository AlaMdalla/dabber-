"use client";

// Shared browser-side image compression, used by every photo upload flow
// (listing photos, rental condition photos) so a phone camera's 10+MB
// original never gets uploaded as-is. Downscales to maxDimension on the
// longest side and re-encodes as webp.

export const MAX_SOURCE_IMAGE_SIZE = 10 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface CompressImageMessages {
  invalidType: string;
  tooLarge: string;
  prepareFailed: string;
  compressFailed: string;
}

export async function compressImage(
  file: File,
  messages: CompressImageMessages,
  maxDimension = 1600,
  quality = 0.82,
): Promise<File> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error(messages.invalidType);
  }
  if (file.size > MAX_SOURCE_IMAGE_SIZE) {
    throw new Error(messages.tooLarge);
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error(messages.prepareFailed);
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );

  if (!blob) {
    throw new Error(messages.compressFailed);
  }

  return new File([blob], `${crypto.randomUUID()}.webp`, {
    type: "image/webp",
  });
}
