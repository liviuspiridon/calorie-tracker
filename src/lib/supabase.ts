import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.example",
  );
}

/**
 * Single shared browser client. Balance is single-user with no Supabase
 * Auth session — access control is the anon key + RLS policies (see
 * supabase/schema.sql), so there's no per-user session state to manage.
 */
export const supabase = createClient(url, anonKey);

/** Lifecycle of remotely-fetched state, shared by the data hooks. */
export type RemoteStatus = "loading" | "error" | "ready";
