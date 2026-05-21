import { supabase } from "@/lib/supabase";
import {
  fallbackAtomicProcesses,
  fallbackBusinessModels,
  fallbackSources,
  fallbackStrategies,
  fallbackSubproblems,
} from "@/lib/fallback-data";
import type { AtomicProcess, BusinessModel, Counts, DistributionChannel, ResearchSource, Strategy, Subproblem } from "@/lib/types";

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

  const [businessModels, strategies, atomicProcesses, shortlisted] = await Promise.all([
    supabase.from("business_models").select("id", { count: "exact", head: true }),
    supabase.from("strategies").select("id", { count: "exact", head: true }),
    supabase.from("atomic_processes").select("id", { count: "exact", head: true }),
    supabase.from("atomic_processes").select("id", { count: "exact", head: true }).eq("shortlisted", true),
  ]);

  return {
    businessModels: businessModels.count ?? 0,
    strategies: strategies.count ?? 0,
    atomicProcesses: atomicProcesses.count ?? 0,
    shortlisted: shortlisted.count ?? 0,
  };
}

export async function listSubproblems(): Promise<Subproblem[]> {
  if (!supabase) return fallbackSubproblems;
  const { data, error } = await supabase.from("overview_subproblems").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listSources(): Promise<ResearchSource[]> {
  if (!supabase) return fallbackSources;
  const { data, error } = await supabase.from("research_sources").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listChannels(): Promise<DistributionChannel[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("distribution_channels").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listBusinessModels(): Promise<BusinessModel[]> {
  if (!supabase) return fallbackBusinessModels;
  const { data, error } = await supabase
    .from("business_models")
    .select("*, business_model_types(*)")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listStrategies(): Promise<Strategy[]> {
  if (!supabase) return fallbackStrategies;
  const { data, error } = await supabase
    .from("strategies")
    .select("*, strategy_business_models(*, business_models(id, title))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAtomicProcesses(shortlistedOnly = false): Promise<AtomicProcess[]> {
  if (!supabase) {
    const sorted = [...fallbackAtomicProcesses].sort((left, right) => right.total_score - left.total_score);
    return shortlistedOnly ? sorted.filter((process) => process.shortlisted) : sorted;
  }
  let query = supabase
    .from("atomic_processes")
    .select("*, strategies(id, title), atomic_process_business_models(*, business_models(id, title))")
    .order("total_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (shortlistedOnly) query = query.eq("shortlisted", true);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function relationTitles<T extends { business_models?: { title: string } | null }>(relations?: T[]) {
  return relations?.map((relation) => relation.business_models?.title).filter(Boolean) as string[] ?? [];
}
