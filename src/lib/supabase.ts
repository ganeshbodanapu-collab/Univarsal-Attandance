import { createClient } from '@supabase/supabase-js';

// Explicit production defaults ensure Android APK and Web builds always connect to the production Supabase instance
const DEFAULT_SUPABASE_URL = 'https://gkphikhsgysoqjradbaz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});



