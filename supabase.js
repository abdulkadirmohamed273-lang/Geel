import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Get from environment variables (required for security)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables!\n\n' +
    'Please create a .env file in the project root with:\n' +
    'REACT_APP_SUPABASE_URL=your_supabase_url\n' +
    'REACT_APP_SUPABASE_ANON_KEY=your_anon_key\n\n' +
    'See .env.example for reference.'
  );
}

// Create Supabase client (module-level singleton - only created once)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// SECURITY NOTE: Service role key has been removed from frontend code.
// It should NEVER be exposed in client-side code.
// If you need admin operations, use Supabase Edge Functions (server-side only).

export default supabase;

