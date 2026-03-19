import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMockMode =
  import.meta.env.VITE_USE_MOCK_DATA === 'true' || (!supabaseUrl && !supabaseAnonKey);

// In mock mode we create a placeholder client so imports never crash.
// In production mode we require both env vars.
if (!isMockMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or enable mock mode with VITE_USE_MOCK_DATA=true.',
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
);
