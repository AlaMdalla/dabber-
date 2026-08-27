"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizePath } from "@/lib/i18n/config";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

export default function LocalizedLink({ href, ...props }: Props) {
  const { locale } = useI18n();
  return <Link href={localizePath(href, locale)} {...props} />;
}
