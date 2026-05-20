"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Plus } from "lucide-react";
import { listAtomicProcesses, relationTitles } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { AtomicProcess } from "@/lib/types";
import { Button, EmptyState, ErrorState, Pill, ScoreBar, SectionHeader } from "@/components/ui";

type CustomAtomicRow = {
  id: string;
  businessModel: string;
  productBrief: string;
  input: string;
  action: string;
  output: string;
  ratings: {
    pain_frequency: number;
    software_replaceability: number;
    willingness_to_pay: number;
    composability: number;
  };
  shortlisted?: boolean;
};

const atomicCustomRowsStorageKey = "dystry.atomic.customRows";

export default function ShortlistPage() {
  const [processes, setProcesses] = useState<AtomicProcess[]>([]);
  const [customRows, setCustomRows] = useState<CustomAtomicRow[]>([]);
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
    loadCustomRows();
  }, []);

  function loadCustomRows() {
    const savedRows = window.localStorage.getItem(atomicCustomRowsStorageKey);
    if (!savedRows) return;

    try {
      const parsed = JSON.parse(savedRows);
      if (Array.isArray(parsed)) setCustomRows(parsed.map(normalizeCustomRow).filter((row) => row.shortlisted));
    } catch {
      window.localStorage.removeItem(atomicCustomRowsStorageKey);
    }
  }

  async function removeFromShortlist(process: AtomicProcess) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("atomic_processes").update({ shortlisted: false }).eq("id", process.id);
    if (updateError) setError(updateError.message);
    refresh();
  }

  function removeCustomFromShortlist(row: CustomAtomicRow) {
    const savedRows = window.localStorage.getItem(atomicCustomRowsStorageKey);
    if (!savedRows) return;

    try {
      const parsed = JSON.parse(savedRows);
      if (!Array.isArray(parsed)) return;

      const nextRows = parsed.map((item) => {
        const normalized = normalizeCustomRow(item);
        return normalized.id === row.id ? { ...normalized, shortlisted: false } : normalized;
      });

      const rowsWithContent = nextRows.filter(rowHasContent);
      if (rowsWithContent.length) {
        window.localStorage.setItem(atomicCustomRowsStorageKey, JSON.stringify(rowsWithContent));
      } else {
        window.localStorage.removeItem(atomicCustomRowsStorageKey);
      }
      setCustomRows(rowsWithContent.filter((item) => item.shortlisted));
    } catch {
      window.localStorage.removeItem(atomicCustomRowsStorageKey);
      setCustomRows([]);
    }
  }

  return (
    <div className="grid gap-6">
      {error ? <ErrorState message={error} /> : null}

      <section>
        <SectionHeader
          label="Shortlist"
          title={`${processes.length + customRows.length} Product Candidate Records`}
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
          {processes.map((process) => {
            const modelTitles = relationTitles(process.atomic_process_business_models);

            return (
              <article key={process.id} className="grid gap-4 border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg text-black">{process.total_score}/20</div>
                      <h2 className="mt-1 max-w-4xl break-words text-sm uppercase leading-5 tracking-wide text-black [overflow-wrap:anywhere]">
                        {candidateTitle(process.title, "Atomic process")}
                      </h2>
                      <p className="mt-2 text-xs text-zinc-500">Related strategy: {process.strategies?.title ?? "Unlinked"}</p>
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
          {customRows.map((row) => (
            <article key={row.id} className="grid gap-4 border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg text-black">{totalRating(row.ratings)}</div>
                    <h2 className="mt-1 max-w-4xl break-words text-sm uppercase leading-5 tracking-wide text-black [overflow-wrap:anywhere]">
                      {candidateTitle(row.productBrief || row.input, "Custom atomic process")}
                    </h2>
                    <p className="mt-2 text-xs text-zinc-500">Related strategy: Custom row</p>
                  </div>
                  <button className="text-black" onClick={() => removeCustomFromShortlist(row)} aria-label="Remove custom row from shortlist">
                    <Heart size={18} className="fill-black" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{row.businessModel || "Unassigned"}</Pill>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Detail label="Input" value={row.input} />
                  <Detail label="Action" value={row.action} />
                  <Detail label="Output" value={row.output} />
                  <Detail label="Product Brief" value={row.productBrief} />
                </div>
              </div>
              <div className="grid content-start gap-3 border border-zinc-200 bg-white p-3">
                <ScoreBar label="Pain Frequency" value={row.ratings.pain_frequency} />
                <ScoreBar label="Software Replaceability" value={row.ratings.software_replaceability} />
                <ScoreBar label="Willingness to Pay" value={row.ratings.willingness_to_pay} />
              </div>
            </article>
          ))}
        </div>
        {!processes.length && !customRows.length ? <EmptyState>No shortlisted atomic processes yet. Heart a process in Stage 3 to send it here.</EmptyState> : null}
      </section>
    </div>
  );
}

function normalizeCustomRow(row: Partial<CustomAtomicRow>): CustomAtomicRow {
  return {
    id: String(row.id || `custom:${Date.now()}`),
    businessModel: String(row.businessModel ?? ""),
    productBrief: String(row.productBrief ?? ""),
    input: String(row.input ?? ""),
    action: String(row.action ?? ""),
    output: String(row.output ?? ""),
    ratings: {
      pain_frequency: clampRating(row.ratings?.pain_frequency),
      software_replaceability: clampRating(row.ratings?.software_replaceability),
      willingness_to_pay: clampRating(row.ratings?.willingness_to_pay),
      composability: clampRating(row.ratings?.composability),
    },
    shortlisted: Boolean(row.shortlisted),
  };
}

function clampRating(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(10, Math.round(numeric)));
}

function totalRating(ratings: CustomAtomicRow["ratings"]) {
  return ratings.pain_frequency + ratings.software_replaceability + ratings.willingness_to_pay;
}

function candidateTitle(value: string | null | undefined, fallback: string) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function rowHasContent(row: CustomAtomicRow) {
  return Boolean(
    row.businessModel.trim() ||
      row.productBrief.trim() ||
      row.input.trim() ||
      row.action.trim() ||
      row.output.trim() ||
      row.shortlisted ||
      totalRating(row.ratings),
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-500 [overflow-wrap:anywhere]">{value || "Not documented"}</div>
    </div>
  );
}
