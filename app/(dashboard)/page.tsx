"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getCachedData, getCounts, invalidateDataCache, listChannels, listSources, listSubproblems } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Counts, DistributionChannel, ResearchSource, Subproblem } from "@/lib/types";
import { Button, EmptyState, ErrorState, Field, Input, SectionHeader, StatCard, Textarea, Pill } from "@/components/ui";

const sourceBlank = {
  title: "",
  description: "",
};
const localSubproblemsStorageKey = "dystry.overview.subproblems";
const localChannelsStorageKey = "dystry.overview.channels";
const localSourcesStorageKey = "dystry.overview.sources";

export default function OverviewPage() {
  const [counts, setCounts] = useState<Counts>(() => getCachedData<Counts>("counts") ?? {
    businessModels: 0,
    strategies: 0,
    atomicProcesses: 0,
    shortlisted: 0,
  });
  const [subproblems, setSubproblems] = useState<Subproblem[]>(() => getCachedData<Subproblem[]>("subproblems") ?? []);
  const [channels, setChannels] = useState<DistributionChannel[]>(() => getCachedData<DistributionChannel[]>("channels") ?? []);
  const [sources, setSources] = useState<ResearchSource[]>(() => getCachedData<ResearchSource[]>("sources") ?? []);
  const [subproblemOpen, setSubproblemOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(sourceBlank);
  const [subproblemName, setSubproblemName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [editingSource, setEditingSource] = useState<ResearchSource | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      const [nextCounts, nextSubproblems, nextChannels, nextSources] = await Promise.all([
        getCounts(),
        listSubproblems(),
        listChannels(),
        listSources(),
      ]);
      setCounts(nextCounts);
      setSubproblems(loadLocalCollection(localSubproblemsStorageKey, nextSubproblems, normalizeSubproblem));
      setChannels(loadLocalCollection(localChannelsStorageKey, nextChannels, normalizeChannel));
      setSources(loadLocalCollection(localSourcesStorageKey, nextSources, normalizeSource));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load overview data");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveSubproblem(event: FormEvent) {
    event.preventDefault();
    if (!subproblemName.trim()) return;

    if (!supabase) {
      const nextSubproblems = [
        ...subproblems,
        {
          id: `local-subproblem:${Date.now()}`,
          name: subproblemName.trim(),
          created_at: new Date().toISOString(),
        },
      ];
      setSubproblems(nextSubproblems);
      persistLocalCollection(localSubproblemsStorageKey, nextSubproblems);
      setSubproblemName("");
      setSubproblemOpen(false);
      return;
    }

    const { error: saveError } = await supabase.from("overview_subproblems").insert({ name: subproblemName.trim() });
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSubproblemName("");
    setSubproblemOpen(false);
    invalidateDataCache("subproblems");
    refresh();
  }

  async function deleteSubproblem(id: string) {
    if (!supabase) {
      const nextSubproblems = subproblems.filter((item) => item.id !== id);
      setSubproblems(nextSubproblems);
      persistLocalCollection(localSubproblemsStorageKey, nextSubproblems);
      return;
    }

    const { error: deleteError } = await supabase.from("overview_subproblems").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    invalidateDataCache("subproblems");
    refresh();
  }

  async function saveChannel(event: FormEvent) {
    event.preventDefault();
    if (!channelName.trim()) return;

    if (!supabase) {
      const nextChannels = [
        ...channels,
        {
          id: `local-channel:${Date.now()}`,
          name: channelName.trim(),
          created_at: new Date().toISOString(),
        },
      ];
      setChannels(nextChannels);
      persistLocalCollection(localChannelsStorageKey, nextChannels);
      setChannelName("");
      setChannelOpen(false);
      return;
    }

    const { error: saveError } = await supabase.from("distribution_channels").insert({ name: channelName.trim() });
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setChannelName("");
    setChannelOpen(false);
    invalidateDataCache("channels");
    refresh();
  }

  async function deleteChannel(id: string) {
    if (!supabase) {
      const nextChannels = channels.filter((item) => item.id !== id);
      setChannels(nextChannels);
      persistLocalCollection(localChannelsStorageKey, nextChannels);
      return;
    }

    const { error: deleteError } = await supabase.from("distribution_channels").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    invalidateDataCache("channels");
    refresh();
  }

  function openSource(source?: ResearchSource) {
    setEditingSource(source ?? null);
    setSourceDraft(source ? { title: source.title, description: source.description } : sourceBlank);
    setSourceOpen(true);
  }

  function closeSourceForm() {
    setSourceOpen(false);
    setEditingSource(null);
    setSourceDraft(sourceBlank);
  }

  async function saveSource(event: FormEvent) {
    event.preventDefault();
    if (!sourceDraft.title.trim()) return;

    const payload = {
      title: sourceDraft.title.trim(),
      description: sourceDraft.description.trim(),
    };

    if (!supabase) {
      const nextSources = editingSource
        ? sources.map((source) => (source.id === editingSource.id ? { ...source, ...payload } : source))
        : [
            ...sources,
            {
              id: `local-source:${Date.now()}`,
              ...payload,
              created_at: new Date().toISOString(),
            },
          ];

      setSources(nextSources);
      persistLocalCollection(localSourcesStorageKey, nextSources);
      setSourceOpen(false);
      setEditingSource(null);
      setSourceDraft(sourceBlank);
      return;
    }

    const result = editingSource
      ? await supabase.from("research_sources").update(payload).eq("id", editingSource.id)
      : await supabase.from("research_sources").insert(payload);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSourceOpen(false);
    setEditingSource(null);
    setSourceDraft(sourceBlank);
    invalidateDataCache("sources");
    refresh();
  }

  async function deleteSource(id: string) {
    if (!supabase) {
      const nextSources = sources.filter((source) => source.id !== id);
      setSources(nextSources);
      persistLocalCollection(localSourcesStorageKey, nextSources);
      return;
    }

    const { error: deleteError } = await supabase.from("research_sources").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    invalidateDataCache("sources");
    refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="border border-zinc-200 bg-white p-5">
        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-zinc-500">Overview</p>
        <h1 className="text-3xl font-semibold tracking-tight text-black">The map is the moat.</h1>
        <p className="mt-4 max-w-5xl text-sm leading-6 text-zinc-400">
          Most distribution tools are built from the inside out. DYSTRY is built from the outside in — an obsessive map of how distribution actually works across every business model, every sector, every size. This is that map.
        </p>
      </section>

      {error ? <ErrorState message={error} /> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Business Models Catalogued" value={counts.businessModels} />
        <StatCard label="Strategy Archetypes Researched" value={counts.strategies} />
        <StatCard label="Atomic Processes Identified" value={counts.atomicProcesses} />
        <StatCard label="Priority 1 Product Candidates" value={counts.shortlisted} />
      </section>

      <section className="border border-zinc-200 bg-white p-5">
        <SectionHeader
          label="Stack"
          title="Distribution Stack — The 40–60 Sub-Problems"
          action={
            <Button onClick={() => setSubproblemOpen(true)}>
              <Plus size={14} />
              Add
            </Button>
          }
        />
        {subproblemOpen ? (
          <form className="mb-4 border border-zinc-200 bg-zinc-50 p-4" onSubmit={saveSubproblem}>
            <Field label="Name">
              <Input value={subproblemName} onChange={(event) => setSubproblemName(event.target.value)} placeholder="Contract velocity" />
            </Field>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => {
                setSubproblemName("");
                setSubproblemOpen(false);
              }}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {subproblems.map((item) => (
            <button key={item.id} className="group" onClick={() => deleteSubproblem(item.id)}>
              <Pill className="group-hover:border-black group-hover:text-black">{item.name} <span className="ml-2 text-zinc-500">×</span></Pill>
            </button>
          ))}
        </div>
        {!subproblems.length ? <EmptyState>No sub-problems yet. Add the first distribution atom.</EmptyState> : null}
      </section>

      <section className="border border-zinc-200 bg-white p-5">
        <SectionHeader
          label="Channels"
          title="Distribution Channels"
          action={
            <Button onClick={() => setChannelOpen(true)}>
              <Plus size={14} />
              Add
            </Button>
          }
        />
        {channelOpen ? (
          <form className="mb-4 border border-zinc-200 bg-zinc-50 p-4" onSubmit={saveChannel}>
            <Field label="Name">
              <Input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Gmail" />
            </Field>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => {
                setChannelName("");
                setChannelOpen(false);
              }}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {channels.map((item) => (
            <button key={item.id} className="group" onClick={() => deleteChannel(item.id)}>
              <Pill className="group-hover:border-black group-hover:text-black">{item.name} <span className="ml-2 text-zinc-500">×</span></Pill>
            </button>
          ))}
        </div>
        {!channels.length ? <EmptyState>No channels yet. Add Gmail, LinkedIn, events, or any active channel.</EmptyState> : null}
      </section>

      <section className="border border-zinc-200 bg-white p-5">
        <SectionHeader
          label="Sources"
          title="Research Methodology — Phase 0 Sources Used"
          action={
            <Button onClick={() => openSource()}>
              <Plus size={14} />
              Add
            </Button>
          }
        />
        {sourceOpen ? (
          <form className="mb-4 grid gap-4 border border-zinc-200 bg-zinc-50 p-4" onSubmit={saveSource}>
            <Field label="Title">
              <Input value={sourceDraft.title} onChange={(event) => setSourceDraft({ ...sourceDraft, title: event.target.value })} />
            </Field>
            <Field label="Description">
              <Textarea value={sourceDraft.description} onChange={(event) => setSourceDraft({ ...sourceDraft, description: event.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeSourceForm}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        ) : null}
        <div className="grid gap-3 md:grid-cols-4">
          {sources.map((source) => (
            <article key={source.id} className="border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm uppercase tracking-wide text-black">{source.title}</h3>
                <div className="flex gap-1">
                  <button className="text-zinc-500 hover:text-black" onClick={() => openSource(source)} aria-label={`Edit ${source.title}`}>
                    <Pencil size={14} />
                  </button>
                  <button className="text-zinc-500 hover:text-black" onClick={() => deleteSource(source.id)} aria-label={`Delete ${source.title}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">{source.description}</p>
            </article>
          ))}
        </div>
        {!sources.length ? <EmptyState>No source categories yet.</EmptyState> : null}
      </section>
    </div>
  );
}

function loadLocalCollection<T>(key: string, fallback: T[], normalize: (value: unknown) => T): T[] {
  if (typeof window === "undefined" || supabase) return fallback;

  const saved = window.localStorage.getItem(key);
  if (!saved) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed.map(normalize);
  } catch {
    window.localStorage.removeItem(key);
  }

  return fallback;
}

function persistLocalCollection<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeSubproblem(value: unknown): Subproblem {
  const row = value && typeof value === "object" ? value as Partial<Subproblem> : {};
  return {
    id: String(row.id || `local-subproblem:${Date.now()}`),
    name: String(row.name || ""),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

function normalizeChannel(value: unknown): DistributionChannel {
  const row = value && typeof value === "object" ? value as Partial<DistributionChannel> : {};
  return {
    id: String(row.id || `local-channel:${Date.now()}`),
    name: String(row.name || ""),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

function normalizeSource(value: unknown): ResearchSource {
  const row = value && typeof value === "object" ? value as Partial<ResearchSource> : {};
  return {
    id: String(row.id || `local-source:${Date.now()}`),
    title: String(row.title || ""),
    description: String(row.description || ""),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}
