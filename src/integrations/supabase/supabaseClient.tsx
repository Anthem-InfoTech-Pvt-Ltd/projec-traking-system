import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase URL and Anon Key must be defined in environment variables');
    }
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'supabase.auth.token',
      },
    });
    console.log('Supabase client initialized');
  }
  return supabaseInstance;
}

// Export the singleton instance for direct use
const supabase = getSupabaseClient();
export default supabase;