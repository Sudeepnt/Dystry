"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Plus, Search, Trash2 } from "lucide-react";
import { listAtomicProcesses, listBusinessModels, relationTitles } from "@/lib/data";
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
  ratings: AtomicRatings;
  shortlisted?: boolean;
  custom?: boolean;
};

const ratingFields: Array<keyof AtomicRatings> = [
  "pain_frequency",
  "software_replaceability",
  "willingness_to_pay",
];
const ratingOptions = Array.from({ length: 11 }, (_, index) => index);
const atomicRatingStorageKey = "dystry.atomic.tableRatings";
const atomicCustomRowsStorageKey = "dystry.atomic.customRows";

export default function AtomicProcessesPage() {
  const [processes, setProcesses] = useState<AtomicProcess[]>([]);
  const [models, setModels] = useState<BusinessModel[]>([]);
  const [customRows, setCustomRows] = useState<AtomicTableRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [ratingOverrides, setRatingOverrides] = useState<Record<string, AtomicRatings>>({});
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
    refresh();

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
          setCustomRows(parsedRows);
          window.localStorage.setItem(atomicCustomRowsStorageKey, JSON.stringify(parsedRows));
        }
      } catch {
        window.localStorage.removeItem(atomicCustomRowsStorageKey);
      }
    }
  }, []);

  const tableRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedModel = models.find((model) => model.id === filter);
    const sourceRows: AtomicTableRow[] = processes.flatMap((process) => {
      const modelTitles = relationTitles(process.atomic_process_business_models);
      const linkedModelIds = process.atomic_process_business_models?.map((item) => item.business_model_id) ?? [];
      const modelsForRows = modelTitles.length ? modelTitles : ["All / TBD"];
      const ratings = ratingOverrides[process.id] ?? processRatings(process);

      return modelsForRows.map((businessModel) => ({
        id: `${process.id}:${businessModel}`,
        processId: process.id,
        linkedModelIds,
        businessModel,
        productBrief: process.product_brief || process.title,
        input: process.input_text || "Not documented",
        action: process.action_text || "Not documented",
        output: process.output_text || "Not documented",
        ratings,
        shortlisted: process.shortlisted,
      }));
    });

    return [...sourceRows, ...customRows]
      .filter((row) => {
        const matchesFilter = filter === "all" || row.linkedModelIds?.includes(filter) || row.businessModel === selectedModel?.title;
        const matchesSearch =
          !query ||
          [row.businessModel, row.productBrief, row.input, row.action, row.output].join(" ").toLowerCase().includes(query);

        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => totalRating(right.ratings) - totalRating(left.ratings));
  }, [customRows, filter, models, processes, ratingOverrides, search]);

  function addCustomRow() {
    setCustomRows((currentRows) => [
      {
        id: `custom:${Date.now()}`,
        linkedModelIds: [],
        businessModel: "",
        productBrief: "",
        input: "",
        action: "",
        output: "",
        ratings: normalizeRatings({}),
        shortlisted: false,
        custom: true,
      },
      ...currentRows,
    ]);
  }

  function updateSourceRating(processId: string, field: keyof AtomicRatings, value: string) {
    const currentProcess = processes.find((process) => process.id === processId);
    const currentRatings = ratingOverrides[processId] ?? (currentProcess ? processRatings(currentProcess) : normalizeRatings({}));
    const nextRatings = {
      ...ratingOverrides,
      [processId]: {
        ...currentRatings,
        [field]: Number(value),
      },
    };
    setRatingOverrides(nextRatings);
    window.localStorage.setItem(atomicRatingStorageKey, JSON.stringify(nextRatings));
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

  function deleteCustomRow(rowId: string) {
    const nextRows = customRows.filter((row) => row.id !== rowId);
    setCustomRows(nextRows);
    persistCustomRows(nextRows);
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
  }

  return (
    <div className="grid gap-6">
      {error ? <ErrorState message={error} /> : null}

      <section className="grid gap-3">
        <div className="relative border border-zinc-200 bg-white">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <Input className="h-12 w-full border-0 pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search atomic process text" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("all")}>
            <Pill className={filter === "all" ? "border-black bg-white text-black" : "hover:border-black hover:text-black"}>All Models</Pill>
          </button>
          {models.map((model) => (
            <button key={model.id} onClick={() => setFilter(model.id)}>
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
        <div className="overflow-x-auto border border-zinc-200 bg-white">
          <table className="min-w-[1304px] w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-[260px]" />
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
                      <div className="p-3 text-zinc-800">{row.businessModel}</div>
                    )}
                  </td>
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <GrowingTextarea value={row.productBrief} label="Product brief" onChange={(value) => updateCustomRow(row.id, (current) => ({ ...current, productBrief: value }))} />
                    ) : (
                      <div className="whitespace-pre-wrap p-3 leading-5 text-zinc-700">{row.productBrief}</div>
                    )}
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
                      <div className="whitespace-pre-wrap p-3 leading-5 text-zinc-600">{row.input}</div>
                    )}
                  </td>
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <GrowingTextarea value={row.action} label="Action" onChange={(value) => updateCustomRow(row.id, (current) => ({ ...current, action: value }))} />
                    ) : (
                      <div className="whitespace-pre-wrap p-3 leading-5 text-zinc-600">{row.action}</div>
                    )}
                  </td>
                  <td className="border-r border-zinc-100 p-0 align-top">
                    {row.custom ? (
                      <GrowingTextarea value={row.output} label="Output" onChange={(value) => updateCustomRow(row.id, (current) => ({ ...current, output: value }))} />
                    ) : (
                      <div className="whitespace-pre-wrap p-3 leading-5 text-zinc-600">{row.output}</div>
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
                      {row.custom ? (
                        <button
                          aria-label="Delete atomic process row"
                          className="inline-flex h-8 w-8 items-center justify-center text-zinc-400 opacity-0 transition hover:text-black group-hover:opacity-100 focus:opacity-100"
                          onClick={() => deleteCustomRow(row.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
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

function GrowingTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <textarea
      aria-label={label}
      className="block min-h-20 w-full resize-none overflow-hidden bg-white px-3 py-2 text-sm leading-5 text-zinc-800 outline-none transition focus:bg-zinc-50"
      ref={resizeTextarea}
      rows={2}
      value={value}
      onInput={(event) => resizeTextarea(event.currentTarget)}
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
      row.shortlisted ||
      totalRating(row.ratings),
  );
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
