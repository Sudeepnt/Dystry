"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Plus } from "lucide-react";
import { getCachedData, invalidateDataCache, listAtomicProcesses, relationTitles } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { AtomicProcess } from "@/lib/types";
import { Button, EmptyState, ErrorState, Pill, ScoreBar, SectionHeader } from "@/components/ui";

export default function ShortlistPage() {
  const [processes, setProcesses] = useState<AtomicProcess[]>(() =>
    (getCachedData<AtomicProcess[]>("atomicProcesses") ?? []).filter((process) => process.shortlisted),
  );
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      setProcesses(await listAtomicProcesses(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load shortlist");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function removeFromShortlist(process: AtomicProcess) {
    if (!supabase) {
      setError("Supabase is not configured. Shortlist changes cannot be saved.");
      return;
    }
    const { error: updateError } = await supabase.from("atomic_processes").update({ shortlisted: false }).eq("id", process.id);
    if (updateError) setError(updateError.message);
    invalidateDataCache("atomicProcesses", "counts");
    refresh();
  }

  const shortlistCount = processes.length;

  return (
    <div className="grid gap-6">
      {error ? <ErrorState message={error} /> : null}

      <section>
        <SectionHeader
          label="Shortlist"
          title={`Priority 1 Shortlist (${shortlistCount})`}
          action={
            <Link href="/atomic-processes">
              <Button>
                <Plus size={14} />
                Add Atomic Process
              </Button>
            </Link>
          }
        />
        <div className="grid gap-3">
          {processes.map((process, index) => {
            const modelTitles = relationTitles(process.atomic_process_business_models);

            return (
              <article key={process.id} className="grid gap-4 border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="shrink-0 text-xs text-zinc-500">#{index + 1}</div>
                      <div className="min-w-0">
                      <div className="text-lg text-black">{process.total_score}/20</div>
                      <h2 className="mt-1 max-w-4xl break-words text-sm uppercase leading-5 tracking-wide text-black [overflow-wrap:anywhere]">
                        {candidateTitle(process.title, "Atomic process")}
                      </h2>
                      <p className="mt-2 text-xs text-zinc-500">Related strategy: {process.strategies?.title ?? "Unlinked"}</p>
                      </div>
                    </div>
                    <button className="text-black" onClick={() => removeFromShortlist(process)} aria-label="Remove from shortlist">
                      <Heart size={18} className="fill-black" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {modelTitles.map((title) => (
                      <Pill key={title}>{title}</Pill>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Detail label="Input" value={process.input_text} />
                    <Detail label="Action" value={process.action_text} />
                    <Detail label="Output" value={process.output_text} />
                    <Detail label="Product Brief" value={process.product_brief} />
                  </div>
                </div>
                <div className="grid content-start gap-3 border border-zinc-200 bg-white p-3">
                  <ScoreBar label="Pain Frequency" value={process.pain_frequency} />
                  <ScoreBar label="Software Replaceability" value={process.software_replaceability} />
                  <ScoreBar label="Willingness to Pay" value={process.willingness_to_pay} />
                  <ScoreBar label="Composability" value={process.composability} />
                </div>
              </article>
              );
            })}
        </div>
        {!processes.length ? <EmptyState>No shortlisted atomic processes yet. Heart a process in Stage 3 to send it here.</EmptyState> : null}
      </section>
    </div>
  );
}

function candidateTitle(value: string | null | undefined, fallback: string) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-500 [overflow-wrap:anywhere]">{value || "Not documented"}</div>
    </div>
  );
}
