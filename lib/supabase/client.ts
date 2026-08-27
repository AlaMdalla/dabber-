import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Every call site does `const supabase = createClient()` locally rather than
// importing a shared instance, so this factory memoizes the underlying
// client itself: all callers end up sharing one client, one realtime
// websocket, and one in-memory auth session instead of a new instance (and,
// for any component that opens a channel, a new socket) per call.
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return browserClient;
}
