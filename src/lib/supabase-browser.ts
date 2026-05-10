import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedBrowserClient: SupabaseClient | null | undefined;

function readBrowserSupabaseUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return value ? value : null;
}

function readBrowserSupabaseKey(): string | null {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return value ? value : null;
}

export function hasSupabaseBrowserEnv(): boolean {
  return readBrowserSupabaseUrl() !== null && readBrowserSupabaseKey() !== null;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cachedBrowserClient !== undefined) {
    return cachedBrowserClient;
  }

  const url = readBrowserSupabaseUrl();
  const key = readBrowserSupabaseKey();

  if (!url || !key) {
    cachedBrowserClient = null;
    return cachedBrowserClient;
  }

  cachedBrowserClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedBrowserClient;
}
