"use client";

import { useEffect, useState } from "react";
import { HandCoins, MessageCircleMore, Repeat2, Search, Share2 } from "lucide-react";
import { listFunnelNotes } from "@/lib/data";
import { supabase } from "@/lib/supabase";
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
  const [notes, setNotes] = useState<Record<FunnelStage["id"], string>>(blankNotes);
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
      const nextNotes = rows.reduce<Record<FunnelStage["id"], string>>((current, row) => {
        if (isFunnelStageId(row.stage)) current[row.stage] = row.content;
        return current;
      }, { ...blankNotes });

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save funnel note");
    }
  }

  return (
    <section className="border border-zinc-200 bg-white p-5">
      <p className="mb-2 text-[12px] text-zinc-500">Funnel</p>
      <h1 className="text-base font-medium text-black">Customer journey</h1>
      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}

      <div className="mt-8 grid grid-cols-[74px_minmax(0,1fr)] gap-x-7">
        <div className="relative col-start-1 row-start-1 row-end-4">
          <div className="absolute left-[36px] top-3 h-[calc(100%-1.5rem)] w-px bg-zinc-300" />
        </div>

        {stages.map((stage) => (
          <div key={stage.id} className="contents">
            <div className="relative col-start-1 flex justify-center">
              <div className="z-10 flex h-14 w-14 items-center justify-center border border-zinc-200 bg-white text-black">
                {stage.icon}
              </div>
            </div>
            <div className="col-start-2 mb-9">
              <h2 className="mb-4 text-lg font-medium text-black">{stage.title}</h2>
              <textarea
                value={notes[stage.id]}
                onChange={(event) => updateStage(stage.id, event.target.value)}
                onBlur={(event) => saveStage(stage.id, event.target.value)}
                placeholder={stage.placeholder}
                className="h-64 w-full resize-none overflow-y-auto border border-zinc-300 bg-white p-4 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black"
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
