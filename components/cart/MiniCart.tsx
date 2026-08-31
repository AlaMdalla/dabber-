"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { ImageOff, ShoppingBag, X } from "lucide-react";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  removeCartItem,
  subscribeCart,
} from "@/lib/cart";
import { itemSubtotal } from "@/lib/rentalPricing";
import { useI18n } from "@/components/i18n/LocaleProvider";

export default function MiniCart() {
  const { t } = useI18n();
  const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, getServerCartSnapshot);
  const [isOpen, setIsOpen] = useState(false);

  if (cart.items.length === 0) {
    return null;
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.items.reduce(
    (sum, item) => sum + (itemSubtotal(item.unitPrice, item.quantity, item.startDate, item.endDate) ?? 0),
    0,
  );

  return (
    <div className="fixed bottom-4 end-4 z-40 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="max-h-[60vh] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {t("cart.title", { name: cart.ownerName ?? "" })}
            </p>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-subtle"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto">
            {cart.items.map((item) => (
              <li key={`${item.listingId}-${item.startDate}-${item.endDate}`} className="flex gap-3 p-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-subtle text-muted">
                  {item.listingImageUrl ? (
                    <Image src={item.listingImageUrl} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <ImageOff className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{item.listingName}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {t("cart.quantityTimesDates", {
                      quantity: item.quantity,
                      start: item.startDate,
                      end: item.endDate,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("cart.remove")}
                  onClick={() => removeCartItem(item.listingId, item.startDate, item.endDate)}
                  className="shrink-0 self-start text-muted hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-3">
            <p className="flex items-center justify-between text-xs text-muted">
              <span>{t("cart.estimatedTotal")}</span>
              <span className="font-semibold text-ink">{t("common.priceValue", { price: total })}</span>
            </p>
            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              className="mt-3 flex h-10 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover"
            >
              {t("cart.viewCart")}
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex h-14 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
      >
        <span className="relative">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          <span className="absolute -end-2 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">
            {itemCount}
          </span>
        </span>
        {t("cart.miniCartLabel")}
      </button>
    </div>
  );
}
