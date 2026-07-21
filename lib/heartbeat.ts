import type { SupabaseClient } from "@supabase/supabase-js";

export type HeartbeatResult = {
  id: string;
  message: string;
  sent_at: string;
};

export async function sendHeartbeat(client: SupabaseClient): Promise<HeartbeatResult> {
  const { data, error } = await client
    .from("heartbeat_messages")
    .upsert({ id: "daily-keepalive", message: "hi", sent_at: new Date().toISOString() }, { onConflict: "id" })
    .select("id, message, sent_at")
    .single();

  if (error) throw error;
  return data;
}
