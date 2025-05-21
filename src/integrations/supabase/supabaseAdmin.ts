import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Singleton instance
let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminInstance) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase URL and Service Role Key must be defined in environment variables');
    }
    supabaseAdminInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('Supabase admin client initialized');
  }
  return supabaseAdminInstance;
}

// Export the singleton instance for direct use
const supabaseAdmin = getSupabaseAdminClient();
export default supabaseAdmin;