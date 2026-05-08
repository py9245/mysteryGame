import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  hasSupabaseServerEnv,
  readSupabaseServerEnv,
  type EnvSource,
} from "@/lib/supabase/env";

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function isSupabaseEnabled(env: EnvSource = process.env): boolean {
  return hasSupabaseServerEnv(env);
}

export function getSupabaseAdminClient(env: EnvSource = process.env): SupabaseClient {
  const config = readSupabaseServerEnv(env);
  const cacheKey = `${config.NEXT_PUBLIC_SUPABASE_URL}:${config.SUPABASE_SERVICE_ROLE_KEY}`;

  if (cachedClient && cachedKey === cacheKey) {
    return cachedClient;
  }

  cachedClient = createClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  cachedKey = cacheKey;

  return cachedClient;
}
