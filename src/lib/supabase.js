import { createClient } from '@supabase/supabase-js';

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

export function ensureSupabase() {
  if (!supabase) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.');
  }

  return supabase;
}

function normalizeSupabaseUrl(value) {
  const rawUrl = String(value ?? '').trim();

  if (!rawUrl) {
    return '';
  }

  try {
    const url = new URL(rawUrl);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return rawUrl.replace(/\/(rest\/v1|realtime\/v1|auth\/v1).*$/, '').replace(/\/$/, '');
  }
}
