"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getCounts, listSources, listSubproblems } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Counts, ResearchSource, Subproblem } from "@/lib/types";
import { Button, EmptyState, ErrorState, Field, Input, Modal, SectionHeader, StatCard, Textarea, Pill } from "@/components/ui";

const sourceBlank = {
  title: "",
  description: "",
};
const localSubproblemsStorageKey = "dystry.overview.subproblems";
const localSourcesStorageKey = "dystry.overview.sources";

export default function OverviewPage() {
  const [counts, setCounts] = useState<Counts>({
    businessModels: 0,
    strategies: 0,
    atomicProcesses: 0,
    shortlisted: 0,
  });
  const [subproblems, setSubproblems] = useState<Subproblem[]>([]);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [subproblemOpen, setSubproblemOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(sourceBlank);
  const [subproblemName, setSubproblemName] = useState("");
  const [editingSource, setEditingSource] = useState<ResearchSource | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      const [nextCounts, nextSubproblems, nextSources] = await Promise.all([
        getCounts(),
        listSubproblems(),
        listSources(),
      ]);
      setCounts(nextCounts);
      setSubproblems(loadLocalCollection(localSubproblemsStorageKey, nextSubproblems, normalizeSubproblem));
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
    refresh();
  }

  async function deleteSubproblem(id: string) {
    if (!supabase) {
      const nextSubproblems = subproblems.filter((item) => item.id !== id);
      setSubproblems(nextSubproblems);
      persistLocalCollection(localSubproblemsStorageKey, nextSubproblems);
      return;
    }

    if (!window.confirm("Delete this sub-problem?")) return;

    const { error: deleteError } = await supabase.from("overview_subproblems").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    refresh();
  }

  function openSource(source?: ResearchSource) {
    setEditingSource(source ?? null);
    setSourceDraft(source ? { title: source.title, description: source.description } : sourceBlank);
    setSourceOpen(true);
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
    refresh();
  }

  async function deleteSource(id: string) {
    if (!supabase) {
      const nextSources = sources.filter((source) => source.id !== id);
      setSources(nextSources);
      persistLocalCollection(localSourcesStorageKey, nextSources);
      return;
    }

    if (!window.confirm("Delete this source category?")) return;

    const { error: deleteError } = await supabase.from("research_sources").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
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
          label="Sources"
          title="Research Methodology — Phase 0 Sources Used"
          action={
            <Button onClick={() => openSource()}>
              <Plus size={14} />
              Add
            </Button>
          }
        />
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

      <Modal title="Add Sub-Problem" open={subproblemOpen} onClose={() => setSubproblemOpen(false)}>
        <form className="grid gap-4" onSubmit={saveSubproblem}>
          <Field label="Name">
            <Input value={subproblemName} onChange={(event) => setSubproblemName(event.target.value)} placeholder="Contract velocity" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSubproblemOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal title={editingSource ? "Edit Source Category" : "Add Source Category"} open={sourceOpen} onClose={() => setSourceOpen(false)}>
        <form className="grid gap-4" onSubmit={saveSource}>
          <Field label="Title">
            <Input value={sourceDraft.title} onChange={(event) => setSourceDraft({ ...sourceDraft, title: event.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={sourceDraft.description} onChange={(event) => setSourceDraft({ ...sourceDraft, description: event.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSourceOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
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

function normalizeSource(value: unknown): ResearchSource {
  const row = value && typeof value === "object" ? value as Partial<ResearchSource> : {};
  return {
    id: String(row.id || `local-source:${Date.now()}`),
    title: String(row.title || ""),
    description: String(row.description || ""),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}
