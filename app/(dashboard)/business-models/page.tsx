"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getCachedData, invalidateDataCache, listBusinessModels } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { BusinessModel } from "@/lib/types";
import { Button, EmptyState, ErrorState, Field, Input, Modal, Pill, SectionHeader, Textarea } from "@/components/ui";

type BusinessModelDraft = {
  title: string;
  tags: string;
  revenue_model: string;
  customer_relationship: string;
  product_type: string;
  scale_profile: string;
  stage_sensitivity: string;
  notes: string;
};

const blankDraft: BusinessModelDraft = {
  title: "",
  tags: "",
  revenue_model: "",
  customer_relationship: "",
  product_type: "",
  scale_profile: "",
  stage_sensitivity: "",
  notes: "",
};

export default function BusinessModelsPage() {
  const [models, setModels] = useState<BusinessModel[]>(() => getCachedData<BusinessModel[]>("businessModels") ?? []);
  const [expanded, setExpanded] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessModel | null>(null);
  const [draft, setDraft] = useState<BusinessModelDraft>(blankDraft);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      setModels(await listBusinessModels());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load business models");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openForm(model?: BusinessModel) {
    setEditing(model ?? null);
    setDraft(
      model
        ? {
            title: model.title,
            tags: model.business_model_types?.map((tag) => tag.name).join(", ") ?? "",
            revenue_model: model.revenue_model ?? "",
            customer_relationship: model.customer_relationship ?? "",
            product_type: model.product_type ?? "",
            scale_profile: model.scale_profile ?? "",
            stage_sensitivity: model.stage_sensitivity ?? "",
            notes: model.notes ?? "",
          }
        : blankDraft,
    );
    setOpen(true);
  }

  async function saveModel(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !draft.title.trim()) return;

    const payload = {
      title: draft.title.trim(),
      revenue_model: draft.revenue_model.trim(),
      customer_relationship: draft.customer_relationship.trim(),
      product_type: draft.product_type.trim(),
      scale_profile: draft.scale_profile.trim(),
      stage_sensitivity: draft.stage_sensitivity.trim(),
      notes: draft.notes.trim(),
    };

    const modelResult = editing
      ? await supabase.from("business_models").update(payload).eq("id", editing.id).select("id").single()
      : await supabase.from("business_models").insert(payload).select("id").single();

    if (modelResult.error) {
      setError(modelResult.error.message);
      return;
    }

    const modelId = modelResult.data.id;
    const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);

    if (editing) {
      const deleteResult = await supabase.from("business_model_types").delete().eq("business_model_id", modelId);
      if (deleteResult.error) {
        setError(deleteResult.error.message);
        return;
      }
    }

    if (tags.length) {
      const insertResult = await supabase
        .from("business_model_types")
        .insert(tags.map((name) => ({ business_model_id: modelId, name })));
      if (insertResult.error) {
        setError(insertResult.error.message);
        return;
      }
    }

    setOpen(false);
    setEditing(null);
    setDraft(blankDraft);
    invalidateDataCache("businessModels", "strategies", "atomicProcesses", "counts");
    refresh();
  }

  async function deleteModel(id: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("business_models").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    invalidateDataCache("businessModels", "strategies", "atomicProcesses", "counts");
    refresh();
  }

  return (
    <div className="grid gap-6">
      {error ? <ErrorState message={error} /> : null}

      <section>
        <SectionHeader
          label="Catalogue"
          title="Business Model Categories"
          action={
            <Button onClick={() => openForm()}>
              <Plus size={14} />
              Add Model
            </Button>
          }
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {models.map((model) => {
            const isOpen = expanded === model.id;
            const tags = model.business_model_types ?? [];

            return (
              <article key={model.id} className={`border bg-white transition ${isOpen ? "border-black" : "border-zinc-200"}`}>
                <button className="block w-full p-4 text-left hover:bg-zinc-50" onClick={() => setExpanded(isOpen ? "" : model.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-black">{model.title}</h2>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">{tags.length} types</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Pill key={tag.id}>{tag.name}</Pill>
                    ))}
                  </div>
                </button>
                {isOpen ? (
                  <div className="border-t border-zinc-200 px-4 pb-4 pt-3">
                    <div className="divide-y divide-zinc-100 text-xs leading-5">
                      <Detail label="Revenue Model" value={model.revenue_model} />
                      <Detail label="Customer Relationship" value={model.customer_relationship} />
                      <Detail label="Product Type" value={model.product_type} />
                      <Detail label="Scale Profile" value={model.scale_profile} />
                      <Detail label="Stage Sensitivity" value={model.stage_sensitivity} />
                      <Detail label="Notes / Findings" value={model.notes} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="ghost" onClick={() => openForm(model)}>
                        <Pencil size={14} />
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => deleteModel(model.id)}>
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {!models.length ? <EmptyState>No business model categories yet.</EmptyState> : null}
      </section>

      <Modal title={editing ? "Edit Business Model Category" : "Add Business Model Category"} open={open} onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={saveModel}>
          <Field label="Category Name">
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </Field>
          <Field label="Business Type Tags">
            <Input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="Newsletter, Course, Creator, Community" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Revenue Model">
              <Textarea value={draft.revenue_model} onChange={(event) => setDraft({ ...draft, revenue_model: event.target.value })} />
            </Field>
            <Field label="Customer Relationship">
              <Textarea value={draft.customer_relationship} onChange={(event) => setDraft({ ...draft, customer_relationship: event.target.value })} />
            </Field>
            <Field label="Product Type">
              <Textarea value={draft.product_type} onChange={(event) => setDraft({ ...draft, product_type: event.target.value })} />
            </Field>
            <Field label="Scale Profile">
              <Textarea value={draft.scale_profile} onChange={(event) => setDraft({ ...draft, scale_profile: event.target.value })} />
            </Field>
          </div>
          <Field label="Stage Sensitivity">
            <Textarea value={draft.stage_sensitivity} onChange={(event) => setDraft({ ...draft, stage_sensitivity: event.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-3 py-3 sm:grid-cols-[180px_1fr]">
      <div className="text-zinc-500">{label}</div>
      <div className="text-zinc-800 sm:text-right">{value || "Not documented"}</div>
    </div>
  );
}
