export interface SupabaseServerEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export type EnvSource = Record<string, string | undefined>;

export const REQUIRED_SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function readSupabaseServerEnv(env: EnvSource): SupabaseServerEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnv(
      env,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
    SUPABASE_SERVICE_ROLE_KEY: getRequiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY"),
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
