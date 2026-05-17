import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);

// Singleton for hooks
let browserClient: ReturnType<typeof createClient> | null = null;
export const getSupabase = () => {
  if (!browserClient) browserClient = createClient();
  return browserClient;
};
