// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kihyynlvajbjpmplmhij.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpaHl5bmx2YWpianBtcGxtaGlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA0MzUxOSwiZXhwIjoyMDYyNjE5NTE5fQ.sWQSy2iEdJcfajhFBvuwdfjeFVrZRxCLyWtCXZuBVJ0";

export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);