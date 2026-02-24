import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
};

// For backward compatibility with existing code, but it might be null
export const supabase = getSupabase();
