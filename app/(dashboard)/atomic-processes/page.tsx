"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Plus, Search, Trash2 } from "lucide-react";
import { getCachedData, invalidateDataCache, listAtomicProcesses, listBusinessModels, relationTitles } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { AtomicProcess, BusinessModel } from "@/lib/types";
import { Button, EmptyState, ErrorState, Input, MultiSelect, Pill, SectionHeader, Select } from "@/components/ui";

type AtomicRatings = {
  pain_frequency: number;
  software_replaceability: number;
  willingness_to_pay: number;
  composability: number;
};

type AtomicTableRow = {
  id: string;
  processId?: string;
  linkedModelIds?: string[];
  businessModel: string;
  productBrief: string;
  input: string;
  action: string;
  output: string;
  stage: string;
  ratings: AtomicRatings;
  shortlisted?: boolean;
  custom?: boolean;
  fresh?: boolean;
};

const ratingFields: Array<keyof AtomicRatings> = [
  "pain_frequency",
  "software_replaceability",
  "willingness_to_pay",
];
const ratingOptions = Array.from({ length: 11 }, (_, index) => index);
const stageOptions = ["lead gen", "lead nurturing", "deal close"];

export default function AtomicProcessesPage() {
  const [processes, setProcesses] = useState<AtomicProcess[]>(() => getCachedData<AtomicProcess[]>("atomicProcesses") ?? []);
  const [models, setModels] = useState<BusinessModel[]>(() => getCachedData<BusinessModel[]>("businessModels") ?? []);
  const [customRows, setCustomRows] = useState<AtomicTableRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [ratingOverrides, setRatingOverrides] = useState<Record<string, AtomicRatings>>({});
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [freshProcessIds, setFreshProcessIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function refresh() {
    try {
      setError("");
      const [nextProcesses, nextModels] = await Promise.all([
        listAtomicProcesses(),
        listBusinessModels(),
      ]);
      setProcesses(nextProcesses);
      setModels(nextModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load atomic processes");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const tableRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedModel = models.find((model) => model.id === filter);
    const sourceRows: AtomicTableRow[] = processes.map((process) => {
      const modelTitles = relationTitles(process.atomic_process_business_models);
      const linkedModelIds = process.atomic_process_business_models?.map((item) => item.business_model_id) ?? [];
      const ratings = ratingOverrides[process.id] ?? processRatings(process);

      return {
        id: process.id,
        processId: process.id,
        linkedModelIds,
        businessModel: modelTitles.length ? modelTitles.join(", ") : "All / TBD",
        productBrief: process.product_brief ?? "",
        input: process.input_text ?? "",
        action: process.action_text ?? "",
        output: process.output_text ?? "",
        stage: normalizeStage(process.stage) || stageOverrides[process.id] || "",
        ratings,
        shortlisted: process.shortlisted,
        fresh: freshProcessIds.includes(process.id),
      };
    });

    return [...sourceRows, ...customRows]
      .filter((row) => {
        const matchesFilter = filter === "all" || row.linkedModelIds?.includes(filter) || row.businessModel === selectedModel?.title;
        const matchesSearch =
          !query ||
          [row.businessModel, row.productBrief, row.stage, row.input, row.action, row.output].join(" ").toLowerCase().includes(query);

        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => {
        if (left.custom && right.custom) return customRowTimestamp(right.id) - customRowTimestamp(left.id);
        if (left.custom !== right.custom) return left.custom ? -1 : 1;
        if (left.fresh !== right.fresh) return left.fresh ? -1 : 1;
        return totalRating(right.ratings) - totalRating(left.ratings);
      });
  }, [customRows, filter, freshProcessIds, models, processes, ratingOverrides, search, stageOverrides]);

  async function addCustomRow() {
    if (supabase) {
      const title = createInternalProcessTitle();
      const { data, error: insertError } = await supabase
        .from("atomic_processes")
        .insert({
          title,
          product_brief: "",
          input_text: "",
          action_text: "",
          output_text: "",
          stage: "",
          pain_frequency: 0,
          software_replaceability: 0,
          willingness_to_pay: 0,
          composability: 0,
        })
        .select("*, strategies(id, title), atomic_process_business_models(*, business_models(id, title))")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        invalidateDataCache("atomicProcesses", "counts");
        setFreshProcessIds((current) => [data.id, ...current.filter((id) => id !== data.id)]);
        setProcesses((current) => [data, ...current]);
      }
      return;
    }

    setError("Supabase is not configured. Atomic processes cannot be created.");
  }

  async function updateSourceRating(processId: string, field: keyof AtomicRatings, value: string) {
    const currentProcess = processes.find((process) => process.id === processId);
    const currentRatings = ratingOverrides[processId] ?? (currentProcess ? processRatings(currentProcess) : normalizeRatings({}));
    const numericValue = Number(value);
    const nextRatings = {
      ...ratingOverrides,
      [processId]: {
        ...currentRatings,
        [field]: numericValue,
      },
    };
    setRatingOverrides(nextRatings);

    if (!supabase) {
      setError("Supabase is not configured. Atomic ratings cannot be saved.");
      return;
    }

    setProcesses((currentProcesses) =>
      currentProcesses.map((process) => (process.id === processId ? { ...process, [field]: numericValue } : process)),
    );

    const { error: updateError } = await supabase.from("atomic_processes").update({ [field]: numericValue }).eq("id", processId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidateDataCache("atomicProcesses");
  }

  function updateCustomRow(rowId: string, update: (row: AtomicTableRow) => AtomicTableRow) {
    const nextRows = customRows.map((row) => (row.id === rowId ? update(row) : row));
    setCustomRows(nextRows);
  }

  function updateCustomRowModels(rowId: string, modelIds: string[]) {
    const modelTitles = models
      .filter((model) => modelIds.includes(model.id))
      .map((model) => model.title);
    updateCustomRow(rowId, (current) => ({
      ...current,
      linkedModelIds: modelIds,
      businessModel: modelTitles.join(", "),
    }));
  }

  async function updateSourceStage(processId: string, value: string) {
    const nextStage = normalizeStage(value);
    const nextStages = { ...stageOverrides, [processId]: nextStage };
    setStageOverrides(nextStages);

    if (!supabase) {
      setError("Supabase is not configured. Atomic stages cannot be saved.");
      return;
    }

    setProcesses((currentProcesses) =>
      currentProcesses.map((process) => (process.id === processId ? { ...process, stage: nextStage } : process)),
    );

    const { error: updateError } = await supabase.from("atomic_processes").update({ stage: nextStage }).eq("id", processId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidateDataCache("atomicProcesses");
  }

  function updateSourceText(processId: string, field: "productBrief" | "input" | "action" | "output", value: string) {
    setProcesses((currentProcesses) =>
      currentProcesses.map((process) =>
        process.id === processId
          ? {
              ...process,
              ...(field === "productBrief" ? { product_brief: value } : {}),
              ...(field === "input" ? { input_text: value } : {}),
              ...(field === "action" ? { action_text: value } : {}),
              ...(field === "output" ? { output_text: value } : {}),
            }
          : process,
      ),
    );
  }

  async function saveSourceText(processId: string, field: "productBrief" | "input" | "action" | "output", value: string) {
    if (!supabase) return;

    const payload =
      field === "productBrief"
        ? { product_brief: value, ...(value.trim() ? { title: value.trim() } : {}) }
        : field === "input"
          ? { input_text: value }
          : field === "action"
            ? { action_text: value }
            : { output_text: value };

    const { error: updateError } = await supabase.from("atomic_processes").update(payload).eq("id", processId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidateDataCache("atomicProcesses");
  }

  function scheduleSaveSourceText(processId: string, field: "productBrief" | "input" | "action" | "output", value: string) {
    const key = `${processId}:${field}`;
    if (saveTimersRef.current[key]) clearTimeout(saveTimersRef.current[key]);
    saveTimersRef.current[key] = setTimeout(() => {
      void saveSourceText(processId, field, value);
      delete saveTimersRef.current[key];
    }, 500);
  }

  async function updateSourceRowModels(row: AtomicTableRow, modelIds: string[]) {
    if (!row.processId || !supabase) return;

    const previousProcesses = processes;
    const nextRelations = modelIds.map((modelId) => {
      const model = models.find((item) => item.id === modelId);
      return {
        id: `${row.processId}:${modelId}`,
        atomic_process_id: row.processId as string,
        business_model_id: modelId,
        business_models: model ? { id: model.id, title: model.title } : null,
      };
    });

    setProcesses((currentProcesses) =>
      currentProcesses.map((process) =>
        process.id === row.processId
          ? { ...process, atomic_process_business_models: nextRelations }
          : process,
      ),
    );

    const deleteResult = await supabase.from("atomic_process_business_models").delete().eq("atomic_process_id", row.processId);
    if (deleteResult.error) {
      setProcesses(previousProcesses);
      setError(deleteResult.error.message);
      return;
    }

    if (modelIds.length) {
      const insertResult = await supabase.from("atomic_process_business_models").insert(
        modelIds.map((modelId) => ({
          atomic_process_id: row.processId,
          business_model_id: modelId,
        })),
      );

      if (insertResult.error) {
        setProcesses(previousProcesses);
        setError(insertResult.error.message);
        return;
      }
    }
    invalidateDataCache("atomicProcesses");
  }

  function deleteCustomRow(rowId: string) {
    const nextRows = customRows.filter((row) => row.id !== rowId);
    setCustomRows(nextRows);
  }

  async function deleteSourceRow(row: AtomicTableRow) {
    if (!row.processId || !supabase) return;

    const previousProcesses = processes;
    setProcesses((currentProcesses) => currentProcesses.filter((process) => process.id !== row.processId));

    const { error: deleteError } = await supabase.from("atomic_processes").delete().eq("id", row.processId);
    if (deleteError) {
      setProcesses(previousProcesses);
      setError(deleteError.message);
      return;
    }
    invalidateDataCache("atomicProcesses", "counts");
  }

  async function toggleShortlist(row: AtomicTableRow) {
    const shortlisted = !row.shortlisted;

    if (row.custom) {
      setError("Supabase is not configured for this row. Shortlist changes must be saved to Supabase.");
      return;
    }

    if (!row.processId || !supabase) return;

    const { error: updateError } = await supabase.from("atomic_processes").update({ shortlisted }).eq("id", row.processId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProcesses((currentProcesses) =>
      currentProcesses.map((process) => (process.id === row.processId ? { ...process, shortlisted } : process)),
    );
    invalidateDataCache("atomicProcesses", "counts");
  }

  return (
    <div className="grid gap-6">
      {error ? <ErrorState message={error} /> : null}

      <section className="grid gap-3">
        <div className="relative border border-zinc-200 bg-white">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <Input className="h-12 w-full border-0 pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search atomic process text" />
        </div>
        <div className="dashboard-mobile-scroll -mx-4 flex snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button className="shrink-0 snap-start" onClick={() => setFilter("all")}>
            <Pill className={filter === "all" ? "border-black bg-white text-black" : "hover:border-black hover:text-black"}>All Models</Pill>
          </button>
          {models.map((model) => (
            <button key={model.id} className="shrink-0 snap-start" onClick={() => setFilter(model.id)}>
              <Pill className={filter === model.id ? "border-black bg-white text-black" : "hover:border-black hover:text-black"}>{model.title}</Pill>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          label="Processes"
          title={`Atomic Process Records (${tableRows.length})`}
          action={
            <Button onClick={addCustomRow}>
              <Plus size={14} />
              Add Atomic Process
            </Button>
          }
        />
        <div className="dashboard-mobile-scroll relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto border-y border-zinc-200 bg-white sm:left-auto sm:w-auto sm:translate-x-0 sm:border">
          <table className="min-w-[1428px] w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[220px]" />
              <col className="w-[260px]" />
              <col className="w-[132px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
              <col className="w-[112px]" />
              <col />
              <col />
              <col />
              <col className="w-[76px]" />
              <col className="w-[72px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-200">
                {[
                  "#",
                  "Business model",
                  "Product brief",
                  "Stage",
                  "Pain frequency",
                  "SW replaceability",
                  "Will people pay to solve this?",
                  "Input",
                  "Action",
                  "Output",
                  "Total ratings",
                  "",
                ].map((heading) => (
                  <th key={heading} className="border-r border-zinc-200 px-3 py-3 text-xs font-medium text-black last:border-r-0">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={row.id} className="group border-b border-zinc-100 last:border-b-0">
                  <td className="border-r border-zinc-100 px-3 py-3 align-top text-xs text-zinc-500">{index + 1}</td>
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <MultiSelect
                        label="Select business models"
                        options={models.map((model) => ({ id: model.id, label: model.title }))}
                        selected={row.linkedModelIds?.length ? row.linkedModelIds : idsFromTitles(row.businessModel, models)}
                        onChange={(modelIds) => updateCustomRowModels(row.id, modelIds)}
                      />
                    ) : (
                      <MultiSelect
                        label="Select business models"
                        options={models.map((model) => ({ id: model.id, label: model.title }))}
                        selected={row.linkedModelIds?.length ? row.linkedModelIds : idsFromTitles(row.businessModel, models)}
                        onChange={(modelIds) => updateSourceRowModels(row, modelIds)}
                      />
                    )}
                  </td>
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <GrowingTextarea value={row.productBrief} label="Product brief" onChange={(value) => updateCustomRow(row.id, (current) => ({ ...current, productBrief: value }))} />
                    ) : (
                      <GrowingTextarea
                        value={row.productBrief}
                        label="Product brief"
                        onChange={(value) => {
                          if (!row.processId) return;
                          updateSourceText(row.processId, "productBrief", value);
                          scheduleSaveSourceText(row.processId, "productBrief", value);
                        }}
                        onBlur={(value) => row.processId ? saveSourceText(row.processId, "productBrief", value) : undefined}
                      />
                    )}
                  </td>
                  <td className="border-r border-zinc-100 px-3 py-2 align-top">
                    <Select
                      aria-label={`Stage ${row.productBrief || "atomic process row"}`}
                      className="h-9 w-full border-0 bg-transparent px-0 text-sm focus:border-0 focus:ring-0"
                      value={row.stage}
                      onChange={(event) => {
                        if (row.custom) {
                          updateCustomRow(row.id, (current) => ({ ...current, stage: event.target.value }));
                          return;
                        }

                        if (row.processId) updateSourceStage(row.processId, event.target.value);
                      }}
                    >
                      <option value="">Select stage</option>
                      {stageOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </td>
                  {ratingFields.map((field) => (
                    <td key={field} className="border-r border-zinc-100 px-3 py-2 align-top">
                      <Select
                        aria-label={field}
                        className="h-9 w-14 border-0 bg-transparent px-0 text-center focus:border-0 focus:ring-0"
                        value={row.ratings[field]}
                        onChange={(event) => {
                          if (row.custom) {
                            updateCustomRow(row.id, (current) => ({
                              ...current,
                              ratings: { ...current.ratings, [field]: Number(event.target.value) },
                            }));
                            return;
                          }

                          if (row.processId) updateSourceRating(row.processId, field, event.target.value);
                        }}
                      >
                        {ratingOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </td>
                  ))}
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <GrowingTextarea value={row.input} label="Input" onChange={(value) => updateCustomRow(row.id, (current) => ({ ...current, input: value }))} />
                    ) : (
                      <GrowingTextarea
                        value={row.input}
                        label="Input"
                        onChange={(value) => {
                          if (!row.processId) return;
                          updateSourceText(row.processId, "input", value);
                          scheduleSaveSourceText(row.processId, "input", value);
                        }}
                        onBlur={(value) => row.processId ? saveSourceText(row.processId, "input", value) : undefined}
                      />
                    )}
                  </td>
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <GrowingTextarea value={row.action} label="Action" onChange={(value) => updateCustomRow(row.id, (current) => ({ ...current, action: value }))} />
                    ) : (
                      <GrowingTextarea
                        value={row.action}
                        label="Action"
                        onChange={(value) => {
                          if (!row.processId) return;
                          updateSourceText(row.processId, "action", value);
                          scheduleSaveSourceText(row.processId, "action", value);
                        }}
                        onBlur={(value) => row.processId ? saveSourceText(row.processId, "action", value) : undefined}
                      />
                    )}
                  </td>
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <GrowingTextarea value={row.output} label="Output" onChange={(value) => updateCustomRow(row.id, (current) => ({ ...current, output: value }))} />
                    ) : (
                      <GrowingTextarea
                        value={row.output}
                        label="Output"
                        onChange={(value) => {
                          if (!row.processId) return;
                          updateSourceText(row.processId, "output", value);
                          scheduleSaveSourceText(row.processId, "output", value);
                        }}
                        onBlur={(value) => row.processId ? saveSourceText(row.processId, "output", value) : undefined}
                      />
                    )}
                  </td>
                  <td className="p-3 align-top text-black">{totalRating(row.ratings)}</td>
                  <td className="p-2 align-top">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        aria-label={row.shortlisted ? "Remove from Priority 1 shortlist" : "Add to Priority 1 shortlist"}
                        className="inline-flex h-8 w-8 items-center justify-center text-black transition hover:bg-zinc-50"
                        onClick={() => toggleShortlist(row)}
                      >
                        <Heart size={16} className={row.shortlisted ? "fill-black" : ""} />
                      </button>
                      <button
                        aria-label="Delete atomic process row"
                        className="inline-flex h-8 w-8 items-center justify-center text-zinc-400 opacity-0 transition hover:text-black group-hover:opacity-100 focus:opacity-100"
                        onClick={() => (row.custom ? deleteCustomRow(row.id) : deleteSourceRow(row))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tableRows.length ? <EmptyState>No atomic processes match this search/filter.</EmptyState> : null}
      </section>
    </div>
  );
}

function GrowingTextarea({
  label,
  value,
  onBlur,
  onChange,
}: {
  label: string;
  value: string;
  onBlur?: (value: string) => void;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      aria-label={label}
      className="block min-h-20 w-full resize-none overflow-hidden bg-white px-3 py-2 text-sm leading-5 text-zinc-800 outline-none transition focus:bg-zinc-50"
      ref={resizeTextarea}
      rows={2}
      value={value}
      onInput={(event) => resizeTextarea(event.currentTarget)}
      onBlur={(event) => onBlur?.(event.target.value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function processRatings(process: AtomicProcess): AtomicRatings {
  return {
    pain_frequency: clampRating(process.pain_frequency),
    software_replaceability: clampRating(process.software_replaceability),
    willingness_to_pay: clampRating(process.willingness_to_pay),
    composability: clampRating(process.composability),
  };
}

function normalizeRatings(value: unknown): AtomicRatings {
  const ratings = value && typeof value === "object" ? value as Partial<AtomicRatings> : {};
  return {
    pain_frequency: clampRating(ratings.pain_frequency),
    software_replaceability: clampRating(ratings.software_replaceability),
    willingness_to_pay: clampRating(ratings.willingness_to_pay),
    composability: clampRating(ratings.composability),
  };
}

function idsFromTitles(value: string, models: BusinessModel[]) {
  const selectedTitles = value.split(",").map((title) => title.trim()).filter(Boolean);
  return models
    .filter((model) => selectedTitles.includes(model.title))
    .map((model) => model.id);
}

function normalizeStage(value: string | null | undefined) {
  const nextValue = String(value ?? "").trim().toLowerCase();
  return stageOptions.includes(nextValue) ? nextValue : "";
}

function customRowTimestamp(rowId: string) {
  const timestamp = Number(rowId.replace("custom:", ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function clampRating(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(10, Math.round(numeric)));
}

function totalRating(ratings: AtomicRatings) {
  return ratingFields.reduce((total, field) => total + ratings[field], 0);
}

function createInternalProcessTitle() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `atomic-process:${crypto.randomUUID()}`;
  return `atomic-process:${Date.now()}`;
}
