"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { getCachedData, invalidateDataCache, listAtomicProcesses, listBusinessModels, listStrategies } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { AtomicProcess, BusinessModel, Strategy } from "@/lib/types";
import { Button, EmptyState, ErrorState, Input, MultiSelect, Pill, SectionHeader, Select } from "@/components/ui";

type MatrixRow = {
  id: string;
  strategyId?: string;
  businessModelIds?: string[];
  businessModel: string;
  strategy: string;
  process: string;
  channels: string;
  output: string;
  stage: string;
  rate: string;
  custom?: boolean;
  draft?: boolean;
};

const defaultTableHeadings = ["Business model", "Strategies", "Process", "Channels", "Output", "Stage", "Rate"];
const ratingOptions = Array.from({ length: 11 }, (_, index) => index);
const stageOptions = [
  "awareness",
  "acquisition",
  "adoption",
  "distribution",
  "viral growth",
  "network growth",
  "sales",
  "brand positioning",
  "lead gen",
  "lead nurturing",
  "deal close",
];
const rowFields: Array<keyof Pick<MatrixRow, "businessModel" | "strategy" | "process" | "channels" | "output" | "stage" | "rate">> = [
  "businessModel",
  "strategy",
  "process",
  "channels",
  "output",
  "stage",
  "rate",
];

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>(() => getCachedData<Strategy[]>("strategies") ?? []);
  const [processes, setProcesses] = useState<AtomicProcess[]>(() => getCachedData<AtomicProcess[]>("atomicProcesses") ?? []);
  const [models, setModels] = useState<BusinessModel[]>(() => getCachedData<BusinessModel[]>("businessModels") ?? []);
  const [tableHeadings, setTableHeadings] = useState(defaultTableHeadings);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
    const sourceRows: MatrixRow[] = filtered.map((strategy) => {
      const linkedModels = strategy.strategy_business_models?.filter((relation) => relation.business_models?.title) ?? [];
      const linkedModelIds = linkedModels.map((relation) => relation.business_model_id);
      const linkedModelTitles = linkedModels.map((relation) => relation.business_models?.title).filter(Boolean) as string[];
      const relatedProcesses = processes
        .filter((process) => process.related_strategy_id === strategy.id)
        .map((process) => process.title);
      const id = `source:${strategy.id}`;
      const draft = isInternalStrategyTitle(strategy.title);

      return {
        id,
        strategyId: strategy.id,
        businessModelIds: linkedModelIds,
        businessModel: linkedModelTitles.length ? linkedModelTitles.join(", ") : "All / TBD",
        strategy: strategy.landmark_example || (draft ? "" : strategy.title),
        process: strategy.key_variables || (relatedProcesses.length ? relatedProcesses.join(", ") : "Unmapped"),
        channels: strategy.channel_mechanism || strategy.strategy_category || "Not documented",
        output: strategy.primary_metric || strategy.landmark_example || "Not documented",
        stage: normalizeStage(strategy.stage),
        rate: rateFromEvidence(strategy.evidence_quality),
        draft,
      };
    });

    return sourceRows.sort((left, right) => {
        if (left.draft !== right.draft) return left.draft ? -1 : 1;
        const ratingDifference = Number(right.rate || 0) - Number(left.rate || 0);
        if (ratingDifference) return ratingDifference;
        return 0;
      });
  }, [filtered, processes]);

  function updateTableHeading(index: number, value: string) {
    const nextHeadings = tableHeadings.map((heading, headingIndex) => (headingIndex === index ? value : heading));
    setTableHeadings(nextHeadings);
  }

  async function addCustomRow() {
    if (!supabase) {
      setError("Supabase is not configured. Strategies cannot be created.");
      return;
    }

    const title = createInternalStrategyTitle();
    const { data, error: insertError } = await supabase
      .from("strategies")
      .insert({
        title,
        stage: "",
        primary_metric: "",
        channel_mechanism: "",
        key_variables: "",
        evidence_quality: "",
      })
      .select("*, strategy_business_models(*, business_models(id, title))")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      invalidateDataCache("strategies", "counts");
      setStrategies((current) => [data, ...current]);
    }
  }

  async function updateSourceRowModels(row: MatrixRow, modelIds: string[]) {
    if (!row.strategyId || !supabase) return;

    const previousStrategies = strategies;
    const nextRelations = modelIds.map((modelId) => {
      const model = models.find((item) => item.id === modelId);
      return {
        id: `${row.strategyId}:${modelId}`,
        strategy_id: row.strategyId as string,
        business_model_id: modelId,
        business_models: model ? { id: model.id, title: model.title } : null,
      };
    });

    setStrategies((currentStrategies) =>
      currentStrategies.map((strategy) =>
        strategy.id === row.strategyId
          ? { ...strategy, strategy_business_models: nextRelations }
          : strategy,
      ),
    );

    const deleteResult = await supabase.from("strategy_business_models").delete().eq("strategy_id", row.strategyId);
    if (deleteResult.error) {
      setStrategies(previousStrategies);
      setError(deleteResult.error.message);
      return;
    }

    if (modelIds.length) {
      const insertResult = await supabase.from("strategy_business_models").insert(
        modelIds.map((modelId) => ({
          strategy_id: row.strategyId,
          business_model_id: modelId,
        })),
      );

      if (insertResult.error) {
        setStrategies(previousStrategies);
        setError(insertResult.error.message);
        return;
      }
    }

    invalidateDataCache("strategies");
    refresh();
  }

  async function updateSourceRate(row: MatrixRow, value: string) {
    const nextRate = normalizeRate(value);
    if (!row.strategyId || !supabase) return;

    setStrategies((currentStrategies) =>
      currentStrategies.map((strategy) =>
        strategy.id === row.strategyId ? { ...strategy, evidence_quality: nextRate ? `Rate: ${nextRate}` : "" } : strategy,
      ),
    );

    const { error: updateError } = await supabase
      .from("strategies")
      .update({ evidence_quality: nextRate ? `Rate: ${nextRate}` : "" })
      .eq("id", row.strategyId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    invalidateDataCache("strategies");
  }

  async function updateSourceStage(row: MatrixRow, value: string) {
    if (!row.strategyId || !supabase) return;

    const previousStrategies = strategies;
    setStrategies((currentStrategies) =>
      currentStrategies.map((strategy) => (strategy.id === row.strategyId ? { ...strategy, stage: value } : strategy)),
    );

    const { error: updateError } = await supabase.from("strategies").update({ stage: value }).eq("id", row.strategyId);
    if (updateError) {
      setStrategies(previousStrategies);
      setError(updateError.message);
      return;
    }
    invalidateDataCache("strategies");
  }

  function updateSourceFieldLocal(row: MatrixRow, field: keyof Pick<MatrixRow, "strategy" | "process" | "channels" | "output">, value: string) {
    if (!row.strategyId) return;
    const strategyField = strategyFieldFromRowField(field);
    setStrategies((currentStrategies) =>
      currentStrategies.map((strategy) =>
        strategy.id === row.strategyId ? { ...strategy, [strategyField]: value } : strategy,
      ),
    );
  }

  async function saveSourceField(row: MatrixRow, field: keyof Pick<MatrixRow, "strategy" | "process" | "channels" | "output">, value: string) {
    if (!row.strategyId || !supabase) return;

    const strategyField = strategyFieldFromRowField(field);
    const nextValue = field === "strategy" ? value.trim() : value;

    const { error: updateError } = await supabase
      .from("strategies")
      .update({ [strategyField]: nextValue })
      .eq("id", row.strategyId);
    if (updateError) {
      setError(updateError.message);
      refresh();
      return;
    }

    invalidateDataCache("strategies", "counts");
  }

  function scheduleSaveSourceField(row: MatrixRow, field: keyof Pick<MatrixRow, "strategy" | "process" | "channels" | "output">, value: string) {
    const key = `${row.id}:${field}`;
    if (saveTimersRef.current[key]) clearTimeout(saveTimersRef.current[key]);
    saveTimersRef.current[key] = setTimeout(() => {
      void saveSourceField(row, field, value);
      delete saveTimersRef.current[key];
    }, 500);
  }

  async function deleteRow(row: MatrixRow) {
    if (!row.strategyId || !supabase) return;

    const previousStrategies = strategies;
    setStrategies((currentStrategies) => currentStrategies.filter((strategy) => strategy.id !== row.strategyId));

    const { error: deleteError } = await supabase.from("strategies").delete().eq("id", row.strategyId);
    if (deleteError) {
      setStrategies(previousStrategies);
      setError(deleteError.message);
      return;
    }

    invalidateDataCache("strategies", "atomicProcesses", "counts");
  }

  return (
    <div className="grid gap-6">
      {error ? <ErrorState message={error} /> : null}

      <section className="grid gap-3">
        <div className="relative border border-zinc-200 bg-white">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <Input className="h-12 w-full border-0 pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search strategy title or text" />
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
          label="Matrix"
          title={`Strategy Operating Table (${tableRows.length})`}
          action={
            <Button onClick={addCustomRow}>
              <Plus size={14} />
              Add Strategy
            </Button>
          }
        />
        <div className="dashboard-mobile-scroll relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto border-y border-zinc-200 bg-white sm:left-auto sm:w-auto sm:translate-x-0 sm:border">
          <table className="min-w-[1100px] w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[240px]" />
              <col className="w-[220px]" />
              <col />
              <col className="w-[160px]" />
              <col />
              <col className="w-[132px]" />
              <col className="w-[90px]" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="border-r border-zinc-200 px-3 py-3 text-xs font-medium text-black">#</th>
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
                  <td className="border-r border-zinc-100 px-3 py-3 align-top text-xs text-zinc-500">{index + 1}</td>
                  {rowFields.map((field) => (
                    <td key={field} className="border-r border-zinc-100 p-0 align-top last:border-r-0">
                      {field === "businessModel" ? (
                        <MultiSelect
                          label="Select business models"
                          options={models.map((model) => ({ id: model.id, label: model.title }))}
                          selected={row.businessModelIds ?? idsFromTitles(row.businessModel, models)}
                          onChange={(modelIds) => updateSourceRowModels(row, modelIds)}
                        />
                      ) : field === "stage" ? (
                        <Select
                          aria-label={`Stage ${row.strategy || "strategy row"}`}
                          className="h-9 w-full border-0 bg-transparent px-3 text-sm focus:border-0 focus:ring-0"
                          value={row.stage}
                          onChange={(event) => updateSourceStage(row, event.target.value)}
                        >
                          <option value="">Select stage</option>
                          {stageOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      ) : field === "rate" ? (
                        <Select
                          aria-label={`Rate ${row.strategy}`}
                          className="h-9 w-14 border-0 bg-transparent px-0 text-center focus:border-0 focus:ring-0"
                          value={row.rate || "0"}
                          onChange={(event) => updateSourceRate(row, event.target.value)}
                        >
                          {ratingOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <textarea
                          aria-label={tableHeadings[rowFields.indexOf(field)]}
                          className={`block min-h-20 w-full resize-none overflow-hidden bg-white px-3 py-2 text-sm leading-5 text-zinc-800 outline-none transition focus:bg-zinc-50 ${field === "channels" ? "text-center" : ""}`}
                          ref={resizeTextarea}
                          rows={2}
                          value={row[field]}
                          onInput={(event) => resizeTextarea(event.currentTarget)}
                          onChange={(event) => {
                            updateSourceFieldLocal(row, field, event.target.value);
                            scheduleSaveSourceField(row, field, event.target.value);
                          }}
                          onBlur={(event) => saveSourceField(row, field, event.target.value)}
                        />
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

function normalizeStage(value: string | null | undefined) {
  const nextValue = String(value ?? "").trim().toLowerCase();
  return stageOptions.includes(nextValue) ? nextValue : "";
}

function rateFromEvidence(value: string | null) {
  const match = value?.match(/Rate:\s*(\d+)/i);
  return match ? normalizeRate(match[1]) : "";
}

function strategyFieldFromRowField(field: keyof Pick<MatrixRow, "strategy" | "process" | "channels" | "output">) {
  const fieldMap = {
    strategy: "landmark_example",
    process: "key_variables",
    channels: "channel_mechanism",
    output: "primary_metric",
  } as const;

  return fieldMap[field];
}

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function idsFromTitles(value: string, models: BusinessModel[]) {
  const selectedTitles = value.split(",").map((title) => title.trim()).filter(Boolean);
  return models
    .filter((model) => selectedTitles.includes(model.title))
    .map((model) => model.id);
}

function createInternalStrategyTitle() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `strategy:${crypto.randomUUID()}`;
  return `strategy:${Date.now()}`;
}

function isInternalStrategyTitle(value: string) {
  return value.startsWith("strategy:");
}
