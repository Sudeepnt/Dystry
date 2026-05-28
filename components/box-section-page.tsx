"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Boxes, Building2, Crosshair, Factory, Package, Plus, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, ErrorState } from "@/components/ui";

export type EditableBox = {
  id: string;
  heading: string;
  content: string;
};

type BoxRow = {
  box_key: string;
  heading: string;
  content: string;
  sort_order: number;
};

type BoxSectionPageProps = {
  eyebrow: string;
  title: string;
  tableName: "assessment_boxes" | "problems_boxes";
  defaultBoxes: EditableBox[];
  cachedBoxes: EditableBox[] | null;
  boxesPromise: Promise<EditableBox[]> | null;
  setCachedBoxes: (boxes: EditableBox[]) => void;
  setBoxesPromise: (promise: Promise<EditableBox[]> | null) => void;
};

const boxIcons = [Building2, Boxes, Package, Factory, UsersRound, Crosshair];

export function BoxSectionPage({
  eyebrow,
  title,
  tableName,
  defaultBoxes,
  cachedBoxes,
  boxesPromise,
  setCachedBoxes,
  setBoxesPromise,
}: BoxSectionPageProps) {
  const initialBoxes = cachedBoxes ?? defaultBoxes;
  const [boxes, setBoxes] = useState<EditableBox[]>(initialBoxes);
  const [newHeading, setNewHeading] = useState("");
  const [error, setError] = useState("");
  const newHeadingRef = useRef<HTMLInputElement>(null);
  const latestBoxesRef = useRef<EditableBox[]>(initialBoxes);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    loadBoxes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBoxes() {
    if (cachedBoxes) {
      latestBoxesRef.current = cachedBoxes;
      setBoxes(cachedBoxes);
      return;
    }

    if (!supabase) {
      setError(`Supabase is not configured. ${eyebrow} boxes cannot be loaded.`);
      return;
    }

    try {
      setError("");
      const nextBoxes = await loadBoxesFromSupabase();

      if (nextBoxes === defaultBoxes) {
        await saveBoxesToSupabase(nextBoxes);
      }

      latestBoxesRef.current = nextBoxes;
      setCachedBoxes(nextBoxes);
      setBoxes(nextBoxes);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to load ${eyebrow.toLowerCase()} boxes`);
    }
  }

  async function persistBoxes(nextBoxes: EditableBox[]) {
    latestBoxesRef.current = nextBoxes;
    setCachedBoxes(nextBoxes);
    setBoxes(nextBoxes);
    if (!supabase) {
      setError(`Supabase is not configured. ${eyebrow} boxes cannot be saved.`);
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
      setError(err instanceof Error ? err.message : `Unable to save ${eyebrow.toLowerCase()} boxes`);
    }
  }

  function updateBox(boxId: string, update: Partial<Pick<EditableBox, "heading" | "content">>) {
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

  async function loadBoxesFromSupabase(): Promise<EditableBox[]> {
    if (!supabase) return defaultBoxes;
    if (boxesPromise) return boxesPromise;

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("box_key, heading, content, sort_order")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        setBoxesPromise(null);
        if (error) throw error;
        return data?.length ? data.map(boxFromRow) : defaultBoxes;
      } catch (error) {
        setBoxesPromise(null);
        throw error;
      }
    })();

    setBoxesPromise(promise);
    return promise;
  }

  async function saveBoxesToSupabase(nextBoxes: EditableBox[]) {
    if (!supabase) return;

    const { error } = await supabase.from(tableName).upsert(
      nextBoxes.map((box, index) => ({
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

  return (
    <section className="border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="mb-2 text-[12px] text-zinc-500">{eyebrow}</p>
          <h1 className="text-base font-medium text-black">{title}</h1>
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
      {error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : null}

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

function boxFromRow(row: BoxRow): EditableBox {
  return {
    id: row.box_key,
    heading: row.heading,
    content: row.content,
  };
}

function createBoxId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `box:${Date.now()}`;
}
