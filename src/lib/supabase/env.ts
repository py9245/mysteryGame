export interface SupabaseServerEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export type EnvSource = Record<string, string | undefined>;

export const REQUIRED_SUPABASE_SERVER_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function hasSupabaseServerEnv(env: EnvSource): boolean {
  return REQUIRED_SUPABASE_SERVER_ENV_KEYS.every((key) => {
    const value = env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function readSupabasePublicKey(env: EnvSource): string | null {
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (typeof publishableKey === "string" && publishableKey.trim().length > 0) {
    return publishableKey;
  }

  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof anonKey === "string" && anonKey.trim().length > 0) {
    return anonKey;
  }

  return null;
}

export function readSupabaseServerEnv(env: EnvSource): SupabaseServerEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: getRequiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      readSupabasePublicKey(env) ?? undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined,
  };
}

function getRequiredEnv(
  env: EnvSource,
  key: keyof SupabaseServerEnv,
): string {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing required Supabase env: ${key}`);
  }

  return value;
}
