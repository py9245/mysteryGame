export interface SupabaseServerEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export type EnvSource = Record<string, string | undefined>;

function getTrimmedValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasSupabaseServerEnv(env: EnvSource): boolean {
  return (
    getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_URL) !== null &&
    getTrimmedValue(env.SUPABASE_SERVICE_ROLE_KEY) !== null
  );
}

export function readSupabasePublicKey(env: EnvSource): string | null {
  return (
    getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function readSupabaseServerEnv(env: EnvSource): SupabaseServerEnv {
  const url = getRequiredSupabaseUrl(env);
  const serviceRoleKey = getRequiredServiceRoleKey(env);

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      readSupabasePublicKey(env) ?? undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? undefined,
  };
}

function getRequiredSupabaseUrl(env: EnvSource): string {
  const value = getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_URL);

  if (!value) {
    throw new Error("Missing required Supabase env: NEXT_PUBLIC_SUPABASE_URL");
  }

  return value;
}

function getRequiredServiceRoleKey(env: EnvSource): string {
  const value = getTrimmedValue(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!value) {
    throw new Error("Missing required Supabase env: SUPABASE_SERVICE_ROLE_KEY");
  }

  return value;
}
