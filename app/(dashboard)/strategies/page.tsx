"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { listAtomicProcesses, listBusinessModels, listStrategies } from "@/lib/data";
import type { AtomicProcess, BusinessModel, Strategy } from "@/lib/types";
import { Button, EmptyState, ErrorState, Input, MultiSelect, Pill, SectionHeader, Select } from "@/components/ui";

type MatrixRow = {
  id: string;
  businessModelIds?: string[];
  businessModel: string;
  strategy: string;
  process: string;
  channels: string;
  output: string;
  rate: string;
  custom?: boolean;
};

const defaultTableHeadings = ["Business model", "Strategies", "Process", "Channels", "Output", "Rate"];
const ratingOptions = Array.from({ length: 11 }, (_, index) => index);
const headingStorageKey = "dystry.strategy.tableHeadings";
const customRowsStorageKey = "dystry.strategy.customRows";
const rowRatingsStorageKey = "dystry.strategy.rowRatings";
const hiddenRowsStorageKey = "dystry.strategy.hiddenRows";
const rowFields: Array<keyof Pick<MatrixRow, "businessModel" | "strategy" | "process" | "channels" | "output" | "rate">> = [
  "businessModel",
  "strategy",
  "process",
  "channels",
  "output",
  "rate",
];

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [processes, setProcesses] = useState<AtomicProcess[]>([]);
  const [models, setModels] = useState<BusinessModel[]>([]);
  const [tableHeadings, setTableHeadings] = useState(defaultTableHeadings);
  const [customRows, setCustomRows] = useState<MatrixRow[]>([]);
  const [rowRatings, setRowRatings] = useState<Record<string, string>>({});
  const [hiddenRows, setHiddenRows] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      const [nextStrategies, nextModels, nextProcesses] = await Promise.all([
        listStrategies(),
        listBusinessModels(),
        listAtomicProcesses(),
      ]);
      setStrategies(nextStrategies);
      setModels(nextModels);
      setProcesses(nextProcesses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load strategies");
    }
  }

  useEffect(() => {
    refresh();

    const savedHeadings = window.localStorage.getItem(headingStorageKey);
    if (savedHeadings) {
      try {
        const parsed = JSON.parse(savedHeadings);
        if (Array.isArray(parsed) && parsed.length === defaultTableHeadings.length) {
          setTableHeadings(parsed.map((heading) => String(heading)));
        } else {
          window.localStorage.removeItem(headingStorageKey);
        }
      } catch {
        window.localStorage.removeItem(headingStorageKey);
      }
    }

    const savedCustomRows = window.localStorage.getItem(customRowsStorageKey);
    if (savedCustomRows) {
      try {
        const parsed = JSON.parse(savedCustomRows);
        if (Array.isArray(parsed)) {
          const parsedRows = parsed.map(normalizeCustomRow).filter(rowHasContent);
          setCustomRows(parsedRows);
          window.localStorage.setItem(customRowsStorageKey, JSON.stringify(parsedRows));
        }
      } catch {
        window.localStorage.removeItem(customRowsStorageKey);
      }
    }

    const savedRatings = window.localStorage.getItem(rowRatingsStorageKey);
    if (savedRatings) {
      try {
        const parsed = JSON.parse(savedRatings);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setRowRatings(
            Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizeRate(String(value))])),
          );
        }
      } catch {
        window.localStorage.removeItem(rowRatingsStorageKey);
      }
    }

    const savedHiddenRows = window.localStorage.getItem(hiddenRowsStorageKey);
    if (savedHiddenRows) {
      try {
        const parsed = JSON.parse(savedHiddenRows);
        if (Array.isArray(parsed)) {
          setHiddenRows(parsed.map((rowId) => String(rowId)));
        }
      } catch {
        window.localStorage.removeItem(hiddenRowsStorageKey);
      }
    }
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return strategies.filter((strategy) => {
      const modelIds = strategy.strategy_business_models?.map((item) => item.business_model_id) ?? [];
      const text = [
        strategy.title,
        strategy.strategy_category,
        strategy.stage,
        strategy.primary_metric,
        strategy.channel_mechanism,
        strategy.evidence_quality,
        strategy.landmark_example,
        strategy.failure_conditions,
        strategy.key_variables,
        strategy.dark_secrets,
      ].join(" ").toLowerCase();

      const matchesFilter = filter === "all" || modelIds.includes(filter);
      const matchesSearch = !query || text.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, strategies]);

  const tableRows = useMemo(() => {
    const sourceRows: MatrixRow[] = filtered.flatMap((strategy) => {
      const linkedModels = strategy.strategy_business_models?.filter((relation) => relation.business_models?.title) ?? [];
      const relatedProcesses = processes
        .filter((process) => process.related_strategy_id === strategy.id)
        .map((process) => process.title);

      return (linkedModels.length ? linkedModels : [{ business_model_id: "", business_models: { title: "All / TBD" } }]).map((relation) => {
        const modelTitle = relation.business_models?.title ?? "All / TBD";
        const id = `source:${strategy.id}:${modelTitle}`;
        return {
          id,
          businessModelIds: relation.business_model_id ? [relation.business_model_id] : [],
          businessModel: modelTitle,
          strategy: strategy.title,
          process: relatedProcesses.length ? relatedProcesses.join(", ") : "Unmapped",
          channels: strategy.channel_mechanism || strategy.strategy_category || "Not documented",
          output: strategy.primary_metric || strategy.landmark_example || "Not documented",
          rate: rowRatings[id] ?? "",
        };
      });
    });

    const visibleCustomRows = customRows.filter((row) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [row.businessModel, row.strategy, row.process, row.channels, row.output, row.rate].join(" ").toLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        row.businessModelIds?.includes(filter) ||
        row.businessModel === models.find((model) => model.id === filter)?.title;
      return matchesSearch && matchesFilter;
    });

    return [...sourceRows, ...visibleCustomRows]
      .filter((row) => !hiddenRows.includes(row.id))
      .sort((left, right) => Number(right.rate || 0) - Number(left.rate || 0));
  }, [customRows, filtered, filter, hiddenRows, models, processes, rowRatings, search]);

  function updateTableHeading(index: number, value: string) {
    const nextHeadings = tableHeadings.map((heading, headingIndex) => (headingIndex === index ? value : heading));
    setTableHeadings(nextHeadings);
    window.localStorage.setItem(headingStorageKey, JSON.stringify(nextHeadings));
  }

  function addCustomRow() {
    const nextRows = [
      {
        id: `custom:${Date.now()}`,
        businessModelIds: [],
        businessModel: "",
        strategy: "",
        process: "",
        channels: "",
        output: "",
        rate: "",
        custom: true,
      },
      ...customRows,
    ];
    setCustomRows(nextRows);
  }

  function updateCustomRow(rowId: string, field: keyof MatrixRow, value: string) {
    const nextRows = customRows.map((row) => (row.id === rowId ? { ...row, [field]: field === "rate" ? normalizeRate(value) : value } : row));
    setCustomRows(nextRows);
    persistCustomRows(nextRows);
  }

  function updateCustomRowModels(rowId: string, modelIds: string[]) {
    const modelTitles = models
      .filter((model) => modelIds.includes(model.id))
      .map((model) => model.title);
    const nextRows = customRows.map((row) =>
      row.id === rowId ? { ...row, businessModelIds: modelIds, businessModel: modelTitles.join(", ") } : row,
    );
    setCustomRows(nextRows);
    persistCustomRows(nextRows);
  }

  function updateSourceRate(rowId: string, value: string) {
    const nextRatings = { ...rowRatings, [rowId]: normalizeRate(value) };
    setRowRatings(nextRatings);
    window.localStorage.setItem(rowRatingsStorageKey, JSON.stringify(nextRatings));
  }

  function deleteRow(row: MatrixRow) {
    if (row.custom) {
      const nextRows = customRows.filter((customRow) => customRow.id !== row.id);
      setCustomRows(nextRows);
      persistCustomRows(nextRows);
      return;
    }

    const nextHiddenRows = hiddenRows.includes(row.id) ? hiddenRows : [...hiddenRows, row.id];
    setHiddenRows(nextHiddenRows);
    window.localStorage.setItem(hiddenRowsStorageKey, JSON.stringify(nextHiddenRows));
  }

  return (
    <div className="grid gap-6">
      {error ? <ErrorState message={error} /> : null}

      <section className="grid gap-3">
        <div className="relative border border-zinc-200 bg-white">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <Input className="h-12 w-full border-0 pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search strategy title or text" />
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
          label="Matrix"
          title="Strategy Operating Table"
          action={
            <Button onClick={addCustomRow}>
              <Plus size={14} />
              Add Strategy
            </Button>
          }
        />
        <div className="overflow-x-auto border border-zinc-200 bg-white">
          <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                {tableHeadings.map((heading, index) => (
                  <th key={index} className="border-r border-zinc-200 p-0 last:border-r-0">
                    <input
                      aria-label={`Edit heading ${index + 1}`}
                      className="h-11 w-full bg-white px-3 text-xs font-medium text-black outline-none transition focus:bg-zinc-50"
                      value={heading}
                      onChange={(event) => updateTableHeading(index, event.target.value)}
                    />
                  </th>
                ))}
                <th className="w-10 border-r border-zinc-200 p-0 last:border-r-0" aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={`${row.id}-${index}`} className="group border-b border-zinc-100 last:border-b-0">
                  {rowFields.map((field) => (
                    <td key={field} className="border-r border-zinc-100 p-0 align-top last:border-r-0">
                      {row.custom && field === "businessModel" ? (
                        <MultiSelect
                          label="Select business models"
                          options={models.map((model) => ({ id: model.id, label: model.title }))}
                          selected={row.businessModelIds ?? idsFromTitles(row.businessModel, models)}
                          onChange={(modelIds) => updateCustomRowModels(row.id, modelIds)}
                        />
	                      ) : row.custom && field === "rate" ? (
	                        <Select
	                          aria-label={tableHeadings[rowFields.indexOf(field)]}
	                          className="h-9 w-14 border-0 bg-transparent px-0 text-center focus:border-0 focus:ring-0"
	                          value={row.rate || "0"}
	                          onChange={(event) => updateCustomRow(row.id, field, event.target.value)}
	                        >
	                          {ratingOptions.map((option) => (
	                            <option key={option} value={option}>
	                              {option}
	                            </option>
	                          ))}
	                        </Select>
	                      ) : row.custom ? (
	                        <textarea
	                          aria-label={tableHeadings[rowFields.indexOf(field)]}
	                          className={`block min-h-20 w-full resize-none overflow-hidden bg-white px-3 py-2 text-sm leading-5 text-zinc-800 outline-none transition focus:bg-zinc-50 ${field === "channels" ? "text-center" : ""}`}
	                          ref={resizeTextarea}
                          rows={2}
                          value={row[field]}
                          onInput={(event) => resizeTextarea(event.currentTarget)}
                          onChange={(event) => updateCustomRow(row.id, field, event.target.value)}
                        />
	                      ) : field === "rate" ? (
	                        <Select
	                          aria-label={`Rate ${row.strategy}`}
	                          className="h-9 w-14 border-0 bg-transparent px-0 text-center focus:border-0 focus:ring-0"
	                          value={row.rate || "0"}
	                          onChange={(event) => updateSourceRate(row.id, event.target.value)}
	                        >
	                          {ratingOptions.map((option) => (
	                            <option key={option} value={option}>
	                              {option}
	                            </option>
	                          ))}
	                        </Select>
	                      ) : (
	                        <div className={`whitespace-pre-wrap p-3 leading-5 text-zinc-700 ${field === "channels" ? "text-center" : ""}`}>{row[field]}</div>
	                      )}
                    </td>
                  ))}
                  <td className="w-10 p-0 align-middle">
                    <button
                      aria-label={`Delete ${row.strategy || "strategy row"}`}
                      className="mx-auto flex h-8 w-8 items-center justify-center text-zinc-400 opacity-0 transition hover:text-black group-hover:opacity-100 focus:opacity-100"
                      onClick={() => deleteRow(row)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tableRows.length ? <EmptyState>No table rows match this search/filter.</EmptyState> : null}
      </section>
    </div>
  );
}

function normalizeRate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return String(Math.min(10, Number(digits)));
}

function persistCustomRows(rows: MatrixRow[]) {
  const rowsWithContent = rows.filter(rowHasContent);
  if (rowsWithContent.length) {
    window.localStorage.setItem(customRowsStorageKey, JSON.stringify(rowsWithContent));
  } else {
    window.localStorage.removeItem(customRowsStorageKey);
  }
}

function rowHasContent(row: MatrixRow) {
  return rowFields.some((field) => row[field].trim());
}

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function normalizeCustomRow(row: Partial<MatrixRow>): MatrixRow {
  const businessModel = String(row.businessModel ?? "");
  return {
    id: row.id || `custom:${Date.now()}`,
    businessModelIds: Array.isArray(row.businessModelIds) ? row.businessModelIds.map(String) : [],
    businessModel,
    strategy: String(row.strategy ?? ""),
    process: String(row.process ?? ""),
    channels: String(row.channels ?? ""),
    output: String(row.output ?? ""),
    rate: normalizeRate(String(row.rate ?? "")),
    custom: true,
  };
}

function idsFromTitles(value: string, models: BusinessModel[]) {
  const selectedTitles = value.split(",").map((title) => title.trim()).filter(Boolean);
  return models
    .filter((model) => selectedTitles.includes(model.title))
    .map((model) => model.id);
}
