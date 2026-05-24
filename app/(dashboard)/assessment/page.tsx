"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Boxes, Building2, Crosshair, Factory, Package, Plus, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, ErrorState } from "@/components/ui";

type AssessmentBox = {
  id: string;
  heading: string;
  content: string;
};

type AssessmentBoxRow = {
  box_key: string;
  heading: string;
  content: string;
  sort_order: number;
};

const storageKey = "dystry.assessment.boxes";
const legacyStorageKey = "dystry.understanding.boxes";

const defaultBoxes: AssessmentBox[] = [
  { id: "understanding-business", heading: "Understanding business", content: "" },
  { id: "business-model", heading: "Business model", content: "" },
  { id: "type-of-product", heading: "Type of Product", content: "" },
  { id: "industry", heading: "Industry", content: "" },
  { id: "target-customers", heading: "Target customers", content: "" },
  { id: "positioning", heading: "Positioning", content: "" },
];

const boxIcons = [Building2, Boxes, Package, Factory, UsersRound, Crosshair];
let cachedAssessmentBoxes: AssessmentBox[] | null = null;
let assessmentBoxesPromise: Promise<AssessmentBox[]> | null = null;

export default function AssessmentPage() {
  const initialBoxes = cachedAssessmentBoxes ?? defaultBoxes;
  const [boxes, setBoxes] = useState<AssessmentBox[]>(initialBoxes);
  const [newHeading, setNewHeading] = useState("");
  const [error, setError] = useState("");
  const newHeadingRef = useRef<HTMLInputElement>(null);
  const latestBoxesRef = useRef<AssessmentBox[]>(initialBoxes);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    loadBoxes();
  }, []);

  async function loadBoxes() {
    const legacySaved = window.localStorage.getItem(legacyStorageKey);
    if (legacySaved && !window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, legacySaved);
      window.localStorage.removeItem(legacyStorageKey);
    }

    const localBoxes = readLocalBoxes();

    if (cachedAssessmentBoxes && !localBoxes.length) {
      latestBoxesRef.current = cachedAssessmentBoxes;
      setBoxes(cachedAssessmentBoxes);
      return;
    }

    if (!supabase) {
      if (localBoxes.length) setBoxes(localBoxes);
      return;
    }

    try {
      setError("");
      let nextBoxes = await loadAssessmentBoxesFromSupabase();

      if (localBoxes.length) {
        nextBoxes = mergeBoxes(nextBoxes, localBoxes);
        await saveBoxesToSupabase(nextBoxes);
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(legacyStorageKey);
      } else if (nextBoxes === defaultBoxes) {
        await saveBoxesToSupabase(nextBoxes);
      }

      latestBoxesRef.current = nextBoxes;
      cachedAssessmentBoxes = nextBoxes;
      setBoxes(nextBoxes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load assessment boxes");
      if (localBoxes.length) {
        latestBoxesRef.current = localBoxes;
        setBoxes(localBoxes);
      }
    }
  }

  async function persistBoxes(nextBoxes: AssessmentBox[]) {
    latestBoxesRef.current = nextBoxes;
    cachedAssessmentBoxes = nextBoxes;
    setBoxes(nextBoxes);
    if (!supabase) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextBoxes));
      return;
    }

    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;

    try {
      setError("");
      await saveBoxesToSupabase(nextBoxes);
      if (saveVersion !== saveVersionRef.current) {
        await saveBoxesToSupabase(latestBoxesRef.current);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save assessment boxes");
    }
  }

  function updateBox(boxId: string, update: Partial<Pick<AssessmentBox, "heading" | "content">>) {
    void persistBoxes(boxes.map((box) => (box.id === boxId ? { ...box, ...update } : box)));
  }

  function addBox(event: FormEvent) {
    event.preventDefault();
    const heading = newHeading.trim();
    if (!heading) {
      newHeadingRef.current?.focus();
      return;
    }

    void persistBoxes([
      ...boxes,
      {
        id: createBoxId(),
        heading,
        content: "",
      },
    ]);
    setNewHeading("");
  }

  return (
    <section className="border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="mb-2 text-[12px] text-zinc-500">Assessment</p>
          <h1 className="text-base font-medium text-black">Business Assessment</h1>
        </div>
        <form className="flex w-full max-w-xl gap-2 sm:w-auto" onSubmit={addBox}>
          <input
            ref={newHeadingRef}
            value={newHeading}
            onChange={(event) => setNewHeading(event.target.value)}
            placeholder="New box heading"
            className="h-10 min-w-0 flex-1 border border-zinc-200 bg-white px-3 text-sm text-black outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 sm:w-72"
          />
          <Button type="submit">
            <Plus size={14} />
            Add Box
          </Button>
        </form>
      </div>
      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}

      <div className="relative mt-5 sm:mt-8">
        <div className="absolute bottom-8 left-[12px] top-2 w-px bg-zinc-300 sm:bottom-11 sm:left-[36px] sm:top-3" />

        {boxes.map((box, index) => {
          const Icon = boxIcons[index % boxIcons.length];

          return (
            <div key={box.id} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-2 sm:grid-cols-[74px_minmax(0,1fr)] sm:gap-x-7">
              <div className="col-start-1 row-start-1 flex justify-center">
                <div className="z-10 flex h-6 w-6 items-center justify-center border border-zinc-200 bg-white text-black sm:h-14 sm:w-14">
                  <Icon className="h-3.5 w-3.5 sm:h-[22px] sm:w-[22px]" />
                </div>
              </div>
              <div className="col-span-2 col-start-1 row-start-2 mb-5 mt-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mb-9 sm:mt-0">
                <input
                  value={box.heading}
                  onChange={(event) => updateBox(box.id, { heading: event.target.value })}
                  aria-label={`${box.heading || "Box"} heading`}
                  className="-mt-8 mb-3 block w-full bg-transparent pl-8 text-sm font-medium text-black outline-none transition placeholder:text-zinc-400 focus:text-zinc-700 sm:mt-0 sm:mb-4 sm:pl-0 sm:text-lg"
                  placeholder="Box heading"
                />
                <textarea
                  value={box.content}
                  onChange={(event) => updateBox(box.id, { content: event.target.value })}
                  placeholder={`Write ${box.heading || "notes"} here.`}
                  className="h-44 w-full resize-none overflow-y-auto border border-zinc-300 bg-white p-3 text-[13px] leading-5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black sm:h-64 sm:p-4 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

async function loadAssessmentBoxesFromSupabase(): Promise<AssessmentBox[]> {
  if (!supabase) return defaultBoxes;
  if (assessmentBoxesPromise) return assessmentBoxesPromise;

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from("assessment_boxes")
        .select("box_key, heading, content, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      assessmentBoxesPromise = null;
      if (error) throw error;
      return data?.length ? data.map(boxFromRow) : defaultBoxes;
    } catch (error) {
      assessmentBoxesPromise = null;
      throw error;
    }
  })();

  assessmentBoxesPromise = promise;
  return promise;
}

function readLocalBoxes() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? normalizeBoxes(parsed) : [];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

function normalizeBoxes(value: Partial<AssessmentBox>[]) {
  const savedBoxes = value
    .map((box) => ({
      id: String(box.id || createBoxId()),
      heading: String(box.heading ?? ""),
      content: String(box.content ?? ""),
    }))
    .filter((box) => box.heading.trim() || box.content.trim());

  const savedIds = new Set(savedBoxes.map((box) => box.id));
  const missingDefaults = defaultBoxes.filter((box) => !savedIds.has(box.id));

  return [...missingDefaults, ...savedBoxes];
}

function mergeBoxes(remoteBoxes: AssessmentBox[], localBoxes: AssessmentBox[]) {
  const merged = [...remoteBoxes];

  for (const localBox of localBoxes) {
    const existingIndex = merged.findIndex((box) => box.id === localBox.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = localBox;
    } else {
      merged.push(localBox);
    }
  }

  return merged;
}

function boxFromRow(row: AssessmentBoxRow): AssessmentBox {
  return {
    id: row.box_key,
    heading: row.heading,
    content: row.content,
  };
}

async function saveBoxesToSupabase(boxes: AssessmentBox[]) {
  if (!supabase) return;

  const { error } = await supabase.from("assessment_boxes").upsert(
    boxes.map((box, index) => ({
      box_key: box.id,
      heading: box.heading.trim() || "Untitled box",
      content: box.content,
      sort_order: index + 1,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "box_key" },
  );

  if (error) throw error;
}

function createBoxId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `box:${Date.now()}`;
}
