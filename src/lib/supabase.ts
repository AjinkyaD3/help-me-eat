"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Null when Supabase isn't configured: the app then runs fully offline with local data only. */
export const supabase: SupabaseClient | null =
  url && key && typeof window !== "undefined"
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

export const cloudEnabled = Boolean(url && key);
