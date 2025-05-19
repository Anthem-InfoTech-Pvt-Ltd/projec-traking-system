// src/integrations/supabase/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kihyynlvajbjpmplmhij.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpaHl5bmx2YWpianBtcGxtaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDM1MTksImV4cCI6MjA2MjYxOTUxOX0.mPSQ6r16uuhIVVu7DRioK3AmUFP9z73pXvvR3f6uVgk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
