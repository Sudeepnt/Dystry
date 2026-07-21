import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  const checks = await Promise.all([
    supabase.from("business_models").select("id", { count: "exact", head: true }),
    supabase.from("strategies").select("id", { count: "exact", head: true }),
    supabase.from("atomic_processes").select("id", { count: "exact", head: true }),
    supabase.from("heartbeat_messages").select("id", { count: "exact", head: true }),
  ]);

  const error = checks.find((check) => check.error)?.error;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    source: "supabase",
    counts: {
      businessModels: checks[0].count ?? 0,
      strategies: checks[1].count ?? 0,
      atomicProcesses: checks[2].count ?? 0,
      heartbeatMessages: checks[3].count ?? 0,
    },
  });
}
