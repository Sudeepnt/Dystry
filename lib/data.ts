import { supabase } from "@/lib/supabase";
import {
  fallbackAtomicProcesses,
  fallbackBusinessModels,
  fallbackSources,
  fallbackStrategies,
  fallbackSubproblems,
} from "@/lib/fallback-data";
import type { AtomicProcess, BusinessModel, Counts, DistributionChannel, FunnelNote, ResearchSource, Strategy, Subproblem } from "@/lib/types";

const cache = new Map<string, { value?: unknown; promise?: Promise<unknown> }>();

export function invalidateDataCache(...keys: string[]) {
  if (!keys.length) {
    cache.clear();
    return;
  }

  for (const key of keys) cache.delete(key);
}

export function getCachedData<T>(key: string): T | undefined {
  return cache.get(key)?.value as T | undefined;
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const current = cache.get(key);
  if (current?.value !== undefined) return current.value as T;
  if (current?.promise) return current.promise as Promise<T>;

  const promise = load()
    .then((value) => {
      cache.set(key, { value });
      return value;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, { promise });
  return promise;
}

export function emptyCounts(): Counts {
  return {
    businessModels: fallbackBusinessModels.length,
    strategies: fallbackStrategies.length,
    atomicProcesses: fallbackAtomicProcesses.length,
    shortlisted: fallbackAtomicProcesses.filter((process) => process.shortlisted).length,
  };
}

export async function getCounts(): Promise<Counts> {
  if (!supabase) return emptyCounts();
  const client = supabase;

  return cached("counts", async () => {
    const [businessModels, strategies, atomicProcesses, shortlisted] = await Promise.all([
      client.from("business_models").select("id", { count: "exact", head: true }),
      client.from("strategies").select("id", { count: "exact", head: true }),
      client.from("atomic_processes").select("id", { count: "exact", head: true }),
      client.from("atomic_processes").select("id", { count: "exact", head: true }).eq("shortlisted", true),
    ]);

    return {
      businessModels: businessModels.count ?? 0,
      strategies: strategies.count ?? 0,
      atomicProcesses: atomicProcesses.count ?? 0,
      shortlisted: shortlisted.count ?? 0,
    };
  });
}

export async function listSubproblems(): Promise<Subproblem[]> {
  if (!supabase) return fallbackSubproblems;
  const client = supabase;
  return cached("subproblems", async () => {
    const { data, error } = await client.from("overview_subproblems").select("*").order("created_at");
    if (error) throw error;
    return data ?? [];
  });
}

export async function listSources(): Promise<ResearchSource[]> {
  if (!supabase) return fallbackSources;
  const client = supabase;
  return cached("sources", async () => {
    const { data, error } = await client.from("research_sources").select("*").order("created_at");
    if (error) throw error;
    return data ?? [];
  });
}

export async function listChannels(): Promise<DistributionChannel[]> {
  if (!supabase) return [];
  const client = supabase;
  return cached("channels", async () => {
    const { data, error } = await client.from("distribution_channels").select("*").order("created_at");
    if (error) throw error;
    return data ?? [];
  });
}

export async function listFunnelNotes(): Promise<FunnelNote[]> {
  if (!supabase) return [];
  const client = supabase;
  return cached("funnelNotes", async () => {
    const { data, error } = await client.from("funnel_notes").select("*").order("created_at");
    if (error) throw error;
    return data ?? [];
  });
}

export async function listBusinessModels(): Promise<BusinessModel[]> {
  if (!supabase) return fallbackBusinessModels;
  const client = supabase;
  return cached("businessModels", async () => {
    const { data, error } = await client
      .from("business_models")
      .select("*, business_model_types(*)")
      .order("created_at");
    if (error) throw error;
    return data ?? [];
  });
}

export async function listStrategies(): Promise<Strategy[]> {
  if (!supabase) return fallbackStrategies;
  const client = supabase;
  return cached("strategies", async () => {
    const { data, error } = await client
      .from("strategies")
      .select("*, strategy_business_models(*, business_models(id, title))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

export async function listAtomicProcesses(shortlistedOnly = false): Promise<AtomicProcess[]> {
  if (!supabase) {
    const sorted = [...fallbackAtomicProcesses].sort((left, right) => right.total_score - left.total_score);
    const rows = shortlistedOnly ? sorted.filter((process) => process.shortlisted) : sorted;
    return dedupeAtomicProcesses(rows);
  }
  const client = supabase;
  const rows = await cached("atomicProcesses", async () => {
    const { data, error } = await client
      .from("atomic_processes")
      .select("*, strategies(id, title), atomic_process_business_models(*, business_models(id, title))")
      .order("total_score", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return dedupeAtomicProcesses(data ?? []);
  });

  return shortlistedOnly ? rows.filter((process) => process.shortlisted) : rows;
}

export function relationTitles<T extends { business_models?: { title: string } | null }>(relations?: T[]) {
  return relations?.map((relation) => relation.business_models?.title).filter(Boolean) as string[] ?? [];
}

function dedupeAtomicProcesses(rows: AtomicProcess[]) {
  const byKey = new Map<string, AtomicProcess>();

  for (const row of rows) {
    const key = atomicProcessContentKey(row);
    const existing = byKey.get(key);

    if (!existing || shouldPreferAtomicProcess(row, existing)) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()];
}

function shouldPreferAtomicProcess(candidate: AtomicProcess, existing: AtomicProcess) {
  if (candidate.shortlisted !== existing.shortlisted) return candidate.shortlisted;
  if (candidate.total_score !== existing.total_score) return candidate.total_score > existing.total_score;
  return new Date(candidate.created_at).getTime() < new Date(existing.created_at).getTime();
}

function atomicProcessContentKey(process: AtomicProcess) {
  return [
    process.product_brief,
    process.input_text,
    process.action_text,
    process.output_text,
    process.stage,
    process.pain_frequency,
    process.software_replaceability,
    process.willingness_to_pay,
    process.composability,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("\u001f");
}
