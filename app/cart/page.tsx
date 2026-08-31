import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CartView from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Mon panier",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/cart");
  }

  return <CartView />;
}
