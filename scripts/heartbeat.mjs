import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data, error } = await supabase
  .from("heartbeat_messages")
  .upsert({ id: "daily-keepalive", message: "hi", sent_at: new Date().toISOString() }, { onConflict: "id" })
  .select("id, message, sent_at")
  .single();

if (error) throw error;

console.log(`Sent heartbeat "${data.message}" at ${data.sent_at}`);
