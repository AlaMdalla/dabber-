import Link from "@/components/i18n/LocalizedLink";
import { getServerI18n } from "@/lib/i18n/server";

export default async function AuthCodeErrorPage() {
  const { t } = await getServerI18n();
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-xl font-semibold text-ink">
        {t("auth.failed")}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {t("auth.invalidLink")}
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {t("common.retry")}
      </Link>
    </div>
  );
}
