import { createClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

const url = getSupabaseUrl();
const anonKey = getSupabaseAnonKey();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
