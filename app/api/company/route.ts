import { createClient } from "@supabase/supabase-js";
import { createCompanyHandlers } from "@/lib/server/company";

const handlers = createCompanyHandlers({
  createAdminClient: () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ),
  createUserClient: (accessToken) => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  ),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
