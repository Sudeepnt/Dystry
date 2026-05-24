"use client";

import { useEffect, useMemo, useState } from "react";
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
const atomicRatingStorageKey = "dystry.atomic.tableRatings";
const atomicCustomRowsStorageKey = "dystry.atomic.customRows";
const atomicStageStorageKey = "dystry.atomic.tableStages";

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
    const savedRatings = window.localStorage.getItem(atomicRatingStorageKey);
    if (savedRatings) {
      try {
        const parsed = JSON.parse(savedRatings);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setRatingOverrides(Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizeRatings(value)])));
        }
      } catch {
        window.localStorage.removeItem(atomicRatingStorageKey);
      }
    }

    const savedCustomRows = window.localStorage.getItem(atomicCustomRowsStorageKey);
    if (savedCustomRows) {
      try {
        const parsed = JSON.parse(savedCustomRows);
        if (Array.isArray(parsed)) {
          const parsedRows = parsed.map(normalizeCustomRow).filter(rowHasContent);
          if (!supabase) {
            setCustomRows(parsedRows);
            window.localStorage.setItem(atomicCustomRowsStorageKey, JSON.stringify(parsedRows));
          } else {
            window.localStorage.removeItem(atomicCustomRowsStorageKey);
          }
        }
      } catch {
        window.localStorage.removeItem(atomicCustomRowsStorageKey);
      }
    }

    const savedStages = window.localStorage.getItem(atomicStageStorageKey);
    if (savedStages) {
      try {
        const parsed = JSON.parse(savedStages);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setStageOverrides(Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizeStage(String(value))])));
        }
      } catch {
        window.localStorage.removeItem(atomicStageStorageKey);
      }
    }

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
        productBrief: process.product_brief || process.title,
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
      const createdAt = new Date().toISOString();
      const title = `Untitled atomic process ${createdAt}`;
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

    setCustomRows((currentRows) => [
      {
        id: `custom:${Date.now()}`,
        linkedModelIds: [],
        businessModel: "",
        productBrief: "",
        input: "",
        action: "",
        output: "",
        stage: "",
        ratings: normalizeRatings({}),
        shortlisted: false,
        custom: true,
      },
      ...currentRows,
    ]);
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
    window.localStorage.setItem(atomicRatingStorageKey, JSON.stringify(nextRatings));

    if (!supabase) return;

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
    persistCustomRows(nextRows);
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
    window.localStorage.setItem(atomicStageStorageKey, JSON.stringify(nextStages));

    if (!supabase) return;

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
        ? { product_brief: value }
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
    persistCustomRows(nextRows);
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
      updateCustomRow(row.id, (current) => ({ ...current, shortlisted }));
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
          title={`${processes.length + customRows.filter(rowHasContent).length} Atomic Process Records`}
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
              {tableRows.map((row) => (
                <tr key={row.id} className="group border-b border-zinc-100 last:border-b-0">
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
                        onChange={(value) => row.processId ? updateSourceText(row.processId, "productBrief", value) : undefined}
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
                        onChange={(value) => row.processId ? updateSourceText(row.processId, "input", value) : undefined}
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
                        onChange={(value) => row.processId ? updateSourceText(row.processId, "action", value) : undefined}
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
                        onChange={(value) => row.processId ? updateSourceText(row.processId, "output", value) : undefined}
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

function normalizeCustomRow(row: Partial<AtomicTableRow>): AtomicTableRow {
  const businessModel = String(row.businessModel ?? "");
  return {
    id: row.id || `custom:${Date.now()}`,
    linkedModelIds: Array.isArray(row.linkedModelIds) ? row.linkedModelIds.map(String) : [],
    businessModel,
    productBrief: String(row.productBrief ?? ""),
    input: String(row.input ?? ""),
    action: String(row.action ?? ""),
    output: String(row.output ?? ""),
    stage: normalizeStage(row.stage),
    ratings: normalizeRatings(row.ratings),
    shortlisted: Boolean(row.shortlisted),
    custom: true,
  };
}

function idsFromTitles(value: string, models: BusinessModel[]) {
  const selectedTitles = value.split(",").map((title) => title.trim()).filter(Boolean);
  return models
    .filter((model) => selectedTitles.includes(model.title))
    .map((model) => model.id);
}

function persistCustomRows(rows: AtomicTableRow[]) {
  const rowsWithContent = rows.filter(rowHasContent);
  if (rowsWithContent.length) {
    window.localStorage.setItem(atomicCustomRowsStorageKey, JSON.stringify(rowsWithContent));
  } else {
    window.localStorage.removeItem(atomicCustomRowsStorageKey);
  }
}

function rowHasContent(row: AtomicTableRow) {
  return Boolean(
    row.businessModel.trim() ||
      row.productBrief.trim() ||
      row.input.trim() ||
      row.action.trim() ||
      row.output.trim() ||
      row.stage.trim() ||
      row.shortlisted ||
      totalRating(row.ratings),
  );
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
