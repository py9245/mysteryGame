import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseRuntimeEnv,
  hasSupabaseRuntimeEnv,
  readSupabaseServerEnv,
  type EnvSource,
} from "@/lib/supabase/env";

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function isSupabaseEnabled(env: EnvSource = process.env): boolean {
  if (env === process.env) {
    return hasSupabaseRuntimeEnv();
  }

  return !!readSupabaseServerEnvSafely(env);
}

export function getSupabaseAdminClient(env: EnvSource = process.env): SupabaseClient {
  const config =
    env === process.env ? getSupabaseRuntimeEnv() : readSupabaseServerEnvSafely(env);

  if (!config) {
    throw new Error("Supabase runtime env is not configured.");
  }

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

function readSupabaseServerEnvSafely(env: EnvSource) {
  try {
    return readSupabaseServerEnv(env);
  } catch {
    return null;
  }
}
