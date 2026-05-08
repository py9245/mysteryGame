import { hasSupabaseServerEnv, readSupabasePublicKey } from "@/lib/supabase/env";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    {
      ok: true,
      data: {
        hasSupabaseServerEnv: hasSupabaseServerEnv(process.env),
        hasGmsKey:
          typeof process.env.GMS_KEY === "string" &&
          process.env.GMS_KEY.trim().length > 0,
        keys: {
          NEXT_PUBLIC_SUPABASE_URL:
            typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
            process.env.NEXT_PUBLIC_SUPABASE_URL.trim().length > 0,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            typeof process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ===
              "string" &&
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim().length > 0,
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length > 0,
          SUPABASE_SERVICE_ROLE_KEY:
            typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" &&
            process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0,
        },
        resolvedPublicKey: readSupabasePublicKey(process.env) !== null,
      },
    },
    { status: 200 },
  );
}
