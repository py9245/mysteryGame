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

function readSupabasePublicKeyFromSource(env: EnvSource): string | null {
  return (
    getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

function readSupabaseUrlFromSource(env: EnvSource): string | null {
  return getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_URL);
}

function readServiceRoleKeyFromSource(env: EnvSource): string | null {
  return getTrimmedValue(env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasSupabaseServerEnv(env: EnvSource): boolean {
  return (
    readSupabaseUrlFromSource(env) !== null &&
    readServiceRoleKeyFromSource(env) !== null
  );
}

export function readSupabasePublicKey(env: EnvSource): string | null {
  return readSupabasePublicKeyFromSource(env);
}

export function readSupabaseServerEnv(env: EnvSource): SupabaseServerEnv {
  const url = readSupabaseUrlFromSource(env);
  const serviceRoleKey = readServiceRoleKeyFromSource(env);

  if (!url) {
    throw new Error("Missing required Supabase env: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing required Supabase env: SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      readSupabasePublicKeyFromSource(env) ?? undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      getTrimmedValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? undefined,
  };
}

export function getSupabaseRuntimeEnv(): SupabaseServerEnv | null {
  const url = getTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey =
    getTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    getTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = getTrimmedValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey ?? undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      getTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? undefined,
  };
}

export function hasSupabaseRuntimeEnv(): boolean {
  return getSupabaseRuntimeEnv() !== null;
}

export function hasSupabaseRuntimePublicKey(): boolean {
  return (
    getTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) !== null ||
    getTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) !== null
  );
}
