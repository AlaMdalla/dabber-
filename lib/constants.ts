// No default: an unset group URL must surface as a "not configured" error to
// the user rather than silently pointing at a hardcoded fallback.
export const DABBER_FACEBOOK_GROUP_URL = process.env.NEXT_PUBLIC_DABBER_FACEBOOK_GROUP_URL;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://dabber-ptoi.vercel.app";
export const SITE_NAME = "Dabber";
