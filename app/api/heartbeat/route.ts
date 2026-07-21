import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sendHeartbeat } from "@/lib/heartbeat";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  try {
    const heartbeat = await sendHeartbeat(supabase);
    return NextResponse.json({ ok: true, heartbeat });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Heartbeat failed" }, { status: 500 });
  }
}
