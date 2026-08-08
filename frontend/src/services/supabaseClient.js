import { createClient } from '@supabase/supabase-js';

const useDevProxy =
  ['https', 'tunnel'].includes(import.meta.env.MODE) && window.location.protocol === 'https:';
const supabaseUrl = useDevProxy
  ? `${window.location.origin}/supabase`
  : import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl || 'http://127.0.0.1:54321', supabaseAnonKey || 'missing-key');
