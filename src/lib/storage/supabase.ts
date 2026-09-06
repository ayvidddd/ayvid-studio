import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Server-only — this key bypasses RLS, so it
 * must never reach a client bundle. Storage is the only Supabase feature we
 * use (auth is handled entirely by NextAuth).
 *
 * Built lazily (not at module scope) so merely importing this module — e.g.
 * transitively, through a type-only import — doesn't crash in environments
 * without Supabase configured yet; the error only surfaces when a caller
 * actually tries to touch Storage.
 */
let cached: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured.");
  }

  cached = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return cached;
}

export const BRAND_ASSETS_BUCKET = "brand-assets";
