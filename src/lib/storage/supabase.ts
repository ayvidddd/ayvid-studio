import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Server-only — this key bypasses RLS, so it
 * must never reach a client bundle. Storage is the only Supabase feature we
 * use (auth is handled entirely by NextAuth).
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const BRAND_ASSETS_BUCKET = "brand-assets";
