"use client";

import { useEffect, useState } from "react";
import { HandCoins, MessageCircleMore, Repeat2, Search, Share2 } from "lucide-react";
import { getCachedData, invalidateDataCache, listFunnelNotes } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { FunnelNote } from "@/lib/types";
import { ErrorState } from "@/components/ui";

type FunnelStage = {
  id: "lead-generation" | "lead-nurturing" | "action-sell" | "retention" | "referral";
  title: string;
  placeholder: string;
  icon: React.ReactNode;
};

const storageKey = "dystry.funnel.notes";
const blankNotes: Record<FunnelStage["id"], string> = {
  "lead-generation": "",
  "lead-nurturing": "",
  "action-sell": "",
  retention: "",
  referral: "",
};

const stages: FunnelStage[] = [
  {
    id: "lead-generation",
    title: "Lead Generation",
    placeholder: "Write lead generation channels, ideas, hooks, sources, or experiments here.",
    icon: <Search size={22} />,
  },
  {
    id: "lead-nurturing",
    title: "Lead Nurturing",
    placeholder: "Write nurture sequences, trust builders, follow-up ideas, or proof assets here.",
    icon: <MessageCircleMore size={22} />,
  },
  {
    id: "action-sell",
    title: "Action / Sell",
    placeholder: "Write close actions, offers, demos, sales moments, or conversion steps here.",
    icon: <HandCoins size={22} />,
  },
  {
    id: "retention",
    title: "Retention",
    placeholder: "Write onboarding, activation, repeat-use, renewal, or customer success ideas here.",
    icon: <Repeat2 size={22} />,
  },
  {
    id: "referral",
    title: "Referral",
    placeholder: "Write referral loops, sharing moments, incentives, partner intros, or word-of-mouth ideas here.",
    icon: <Share2 size={22} />,
  },
];

export default function FunnelPage() {
  const [notes, setNotes] = useState<Record<FunnelStage["id"], string>>(() => notesFromRows(getCachedData<FunnelNote[]>("funnelNotes") ?? []));
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    if (!supabase) {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved) as Partial<Record<FunnelStage["id"], string>>;
        setNotes((current) => ({ ...current, ...parsed }));
      } catch {
        window.localStorage.removeItem(storageKey);
      }
      return;
    }

    try {
      setError("");
      const rows = await listFunnelNotes();
      const nextNotes = notesFromRows(rows);

      const saved = window.localStorage.getItem(storageKey);
      if (saved && !rows.length) {
        try {
          const parsed = JSON.parse(saved) as Partial<Record<FunnelStage["id"], string>>;
          const localNotes = { ...nextNotes, ...parsed };
          setNotes(localNotes);
          await Promise.all(stages.map((stage) => saveStageToSupabase(stage.id, localNotes[stage.id] || "")));
          window.localStorage.removeItem(storageKey);
          return;
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }

      setNotes(nextNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load funnel notes");
    }
  }

  function updateStage(stageId: FunnelStage["id"], value: string) {
    const nextNotes = { ...notes, [stageId]: value };
    setNotes(nextNotes);

    if (!supabase) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextNotes));
    }
  }

  async function saveStage(stageId: FunnelStage["id"], value: string) {
    if (!supabase) return;

    try {
      setError("");
      await saveStageToSupabase(stageId, value);
      invalidateDataCache("funnelNotes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save funnel note");
    }
  }

  return (
    <section className="border border-zinc-200 bg-white p-4 sm:p-5">
      <p className="mb-2 text-[12px] text-zinc-500">Funnel</p>
      <h1 className="text-base font-medium text-black">Customer journey</h1>
      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}

      <div className="relative mt-5 sm:mt-8">
        <div className="absolute bottom-8 left-[12px] top-2 w-px bg-zinc-300 sm:bottom-11 sm:left-[36px] sm:top-3" />

        {stages.map((stage) => (
          <div key={stage.id} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-2 sm:grid-cols-[74px_minmax(0,1fr)] sm:gap-x-7">
            <div className="col-start-1 row-start-1 flex justify-center">
              <div className="z-10 flex h-6 w-6 items-center justify-center border border-zinc-200 bg-white text-black [&_svg]:h-3.5 [&_svg]:w-3.5 sm:h-14 sm:w-14 sm:[&_svg]:h-[22px] sm:[&_svg]:w-[22px]">
                {stage.icon}
              </div>
            </div>
            <div className="col-span-2 col-start-1 row-start-2 mb-5 mt-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mb-9 sm:mt-0">
              <h2 className="-mt-8 mb-3 pl-8 text-sm font-medium text-black sm:mt-0 sm:mb-4 sm:pl-0 sm:text-lg">{stage.title}</h2>
              <textarea
                value={notes[stage.id]}
                onChange={(event) => updateStage(stage.id, event.target.value)}
                onBlur={(event) => saveStage(stage.id, event.target.value)}
                placeholder={stage.placeholder}
                className="h-44 w-full resize-none overflow-y-auto border border-zinc-300 bg-white p-3 text-[13px] leading-5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black sm:h-64 sm:p-4 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function isFunnelStageId(value: string): value is FunnelStage["id"] {
  return stages.some((stage) => stage.id === value);
}

function notesFromRows(rows: FunnelNote[]) {
  return rows.reduce<Record<FunnelStage["id"], string>>((current, row) => {
    if (isFunnelStageId(row.stage)) current[row.stage] = row.content;
    return current;
  }, { ...blankNotes });
}

async function saveStageToSupabase(stage: FunnelStage["id"], content: string) {
  if (!supabase) return;

  const { error } = await supabase
    .from("funnel_notes")
    .upsert(
      {
        stage,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stage" },
    );

  if (error) throw error;
}
