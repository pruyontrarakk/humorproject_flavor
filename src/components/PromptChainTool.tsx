"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type HumorFlavor = {
  id: number | string;
  description?: string | null;
  slug?: string | null;
  created_datetime_utc?: string | null;
};

type HumorFlavorStep = {
  id: number | string;
  humor_flavor_id: number | string;
  humor_flavor_step_type_id: number | string;
  description?: string | null;
  llm_system_prompt?: string | null;
  llm_user_prompt?: string | null;
  created_datetime_utc?: string | null;
};

type StepTypeRow = {
  id: number | string;
  description?: string | null;
  name?: string | null;
  [key: string]: unknown;
};

type ImageRow = {
  id: string;
  url?: string | null;
  created_datetime_utc?: string | null;
};

function stepTypeLabel(row: StepTypeRow) {
  const bits = [row.name, row.description].filter(Boolean);
  return bits.length ? bits.join(" — ") : String(row.id);
}

export function PromptChainTool() {
  const supabase = useMemo(() => createClient(), []);

  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [flavorLoading, setFlavorLoading] = useState(true);
  const [flavorError, setFlavorError] = useState<string | null>(null);

  const [stepTypes, setStepTypes] = useState<StepTypeRow[]>([]);

  const [selectedFlavorId, setSelectedFlavorId] = useState<string>("");
  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);

  const [images, setImages] = useState<ImageRow[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string>("");

  const [newFlavorDesc, setNewFlavorDesc] = useState("");
  const [newFlavorSlug, setNewFlavorSlug] = useState("");

  const [editFlavorDesc, setEditFlavorDesc] = useState("");
  const [editFlavorSlug, setEditFlavorSlug] = useState("");

  const [newStepTypeId, setNewStepTypeId] = useState<string>("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepSys, setNewStepSys] = useState("");
  const [newStepUser, setNewStepUser] = useState("");

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepDesc, setEditStepDesc] = useState("");
  const [editStepSys, setEditStepSys] = useState("");
  const [editStepUser, setEditStepUser] = useState("");
  const [editStepTypeId, setEditStepTypeId] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [genResult, setGenResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const [captionsPreview, setCaptionsPreview] = useState<unknown[] | null>(null);
  const [captionsError, setCaptionsError] = useState<string | null>(null);

  const loadFlavors = useCallback(async () => {
    setFlavorLoading(true);
    setFlavorError(null);
    const { data, error } = await supabase
      .from("humor_flavors")
      .select("*")
      .order("created_datetime_utc", { ascending: false });
    if (error) {
      setFlavorError(error.message);
      setFlavors([]);
    } else {
      setFlavors((data as HumorFlavor[]) ?? []);
    }
    setFlavorLoading(false);
  }, [supabase]);

  const loadStepTypes = useCallback(async () => {
    const { data, error } = await supabase.from("humor_flavor_step_types").select("*").order("id", {
      ascending: true
    });
    if (!error && data) {
      setStepTypes(data as StepTypeRow[]);
    }
  }, [supabase]);

  const loadSteps = useCallback(
    async (flavorId: string) => {
      if (!flavorId) {
        setSteps([]);
        return;
      }
      setStepsLoading(true);
      setStepsError(null);
      const { data, error } = await supabase
        .from("humor_flavor_steps")
        .select("*")
        .eq("humor_flavor_id", flavorId)
        .order("humor_flavor_step_type_id", { ascending: true });
      if (error) {
        setStepsError(error.message);
        setSteps([]);
      } else {
        setSteps((data as HumorFlavorStep[]) ?? []);
      }
      setStepsLoading(false);
    },
    [supabase]
  );

  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    setImagesError(null);
    const { data, error } = await supabase
      .from("images")
      .select("id, url, created_datetime_utc")
      .order("created_datetime_utc", { ascending: false })
      .limit(40);
    if (error) {
      setImagesError(error.message);
      setImages([]);
    } else {
      setImages((data as ImageRow[]) ?? []);
    }
    setImagesLoading(false);
  }, [supabase]);

  const tryLoadCaptionsForFlavor = useCallback(
    async (flavorId: string) => {
      if (!flavorId) {
        setCaptionsPreview(null);
        return;
      }
      setCaptionsError(null);
      const { data, error } = await supabase
        .from("captions")
        .select("*")
        .eq("humor_flavor_id", flavorId)
        .order("created_datetime_utc", { ascending: false })
        .limit(25);
      if (error) {
        setCaptionsPreview(null);
        setCaptionsError(
          "Could not load captions for this flavor (column or RLS may differ in your schema)."
        );
        return;
      }
      setCaptionsPreview(data ?? []);
    },
    [supabase]
  );

  useEffect(() => {
    void loadFlavors();
    void loadStepTypes();
    void loadImages();
  }, [loadFlavors, loadStepTypes, loadImages]);

  useEffect(() => {
    void loadSteps(selectedFlavorId);
    void tryLoadCaptionsForFlavor(selectedFlavorId);
  }, [selectedFlavorId, loadSteps, tryLoadCaptionsForFlavor]);

  const selectedFlavor = flavors.find(f => String(f.id) === selectedFlavorId) ?? null;

  useEffect(() => {
    if (selectedFlavor) {
      setEditFlavorDesc(selectedFlavor.description ?? "");
      setEditFlavorSlug(selectedFlavor.slug ?? "");
    } else {
      setEditFlavorDesc("");
      setEditFlavorSlug("");
    }
  }, [selectedFlavor]);

  useEffect(() => {
    if (stepTypes.length && !newStepTypeId) {
      setNewStepTypeId(String(stepTypes[0].id));
    }
  }, [stepTypes, newStepTypeId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  async function handleCreateFlavor(e: React.FormEvent) {
    e.preventDefault();
    if (!newFlavorDesc.trim()) {
      showToast("Description is required.");
      return;
    }
    setBusy(true);
    const slug =
      newFlavorSlug.trim() ||
      newFlavorDesc
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const { data, error } = await supabase
      .from("humor_flavors")
      .insert({ description: newFlavorDesc.trim(), slug })
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setNewFlavorDesc("");
    setNewFlavorSlug("");
    await loadFlavors();
    if (data?.id != null) {
      setSelectedFlavorId(String(data.id));
    }
    showToast("Flavor created.");
  }

  async function handleUpdateFlavor(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlavorId) return;
    setBusy(true);
    const { error } = await supabase
      .from("humor_flavors")
      .update({
        description: editFlavorDesc.trim() || null,
        slug: editFlavorSlug.trim() || null
      })
      .eq("id", selectedFlavorId);
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    await loadFlavors();
    showToast("Flavor updated.");
  }

  async function handleDeleteFlavor() {
    if (!selectedFlavorId) return;
    if (!confirm("Delete this humor flavor and rely on DB cascade for its steps?")) return;
    setBusy(true);
    const { error } = await supabase.from("humor_flavors").delete().eq("id", selectedFlavorId);
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setSelectedFlavorId("");
    await loadFlavors();
    showToast("Flavor deleted.");
  }

  async function handleCreateStep(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlavorId || !newStepTypeId) return;
    setBusy(true);
    const { error } = await supabase.from("humor_flavor_steps").insert({
      humor_flavor_id: selectedFlavorId,
      humor_flavor_step_type_id: newStepTypeId,
      description: newStepDesc.trim() || null,
      llm_system_prompt: newStepSys.trim() || null,
      llm_user_prompt: newStepUser.trim() || null
    });
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setNewStepDesc("");
    setNewStepSys("");
    setNewStepUser("");
    await loadSteps(selectedFlavorId);
    showToast("Step added.");
  }

  function beginEditStep(step: HumorFlavorStep) {
    setEditingStepId(String(step.id));
    setEditStepDesc(step.description ?? "");
    setEditStepSys(step.llm_system_prompt ?? "");
    setEditStepUser(step.llm_user_prompt ?? "");
    setEditStepTypeId(String(step.humor_flavor_step_type_id));
  }

  async function saveEditStep() {
    if (!editingStepId || !selectedFlavorId) return;
    setBusy(true);
    const { error } = await supabase
      .from("humor_flavor_steps")
      .update({
        description: editStepDesc.trim() || null,
        llm_system_prompt: editStepSys.trim() || null,
        llm_user_prompt: editStepUser.trim() || null,
        humor_flavor_step_type_id: editStepTypeId
      })
      .eq("id", editingStepId);
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setEditingStepId(null);
    await loadSteps(selectedFlavorId);
    showToast("Step saved.");
  }

  async function deleteStep(stepId: string) {
    if (!selectedFlavorId) return;
    if (!confirm("Delete this step?")) return;
    setBusy(true);
    const { error } = await supabase.from("humor_flavor_steps").delete().eq("id", stepId);
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    await loadSteps(selectedFlavorId);
    showToast("Step deleted.");
  }

  /**
   * Chain order follows `humor_flavor_step_type_id`. Swap adjacent steps in the sorted list
   * using a spare step type id not used by this flavor (avoids unique constraint clashes).
   */
  async function reorderStep(fromIndex: number, direction: -1 | 1) {
    if (!selectedFlavorId) return;
    const ordered = [...steps].sort((a, b) => {
      const na = Number(a.humor_flavor_step_type_id);
      const nb = Number(b.humor_flavor_step_type_id);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
      return String(a.humor_flavor_step_type_id).localeCompare(String(b.humor_flavor_step_type_id));
    });
    const j = fromIndex + direction;
    if (j < 0 || j >= ordered.length) return;

    const a = ordered[fromIndex];
    const b = ordered[j];
    const used = new Set(ordered.map(s => String(s.humor_flavor_step_type_id)));
    const spare = stepTypes.find(t => !used.has(String(t.id)));
    if (!spare) {
      showToast(
        "Cannot reorder: this flavor uses every step type. Add another step type or free one."
      );
      return;
    }

    const ta = String(a.humor_flavor_step_type_id);
    const tb = String(b.humor_flavor_step_type_id);
    const ts = String(spare.id);

    setBusy(true);
    const r1 = await supabase.from("humor_flavor_steps").update({ humor_flavor_step_type_id: ts }).eq("id", a.id);
    if (r1.error) {
      setBusy(false);
      showToast(r1.error.message);
      return;
    }
    const r2 = await supabase.from("humor_flavor_steps").update({ humor_flavor_step_type_id: ta }).eq("id", b.id);
    if (r2.error) {
      setBusy(false);
      showToast(r2.error.message);
      return;
    }
    const r3 = await supabase.from("humor_flavor_steps").update({ humor_flavor_step_type_id: tb }).eq("id", a.id);
    setBusy(false);
    if (r3.error) {
      showToast(r3.error.message);
      return;
    }
    await loadSteps(selectedFlavorId);
    showToast("Order updated.");
  }

  async function runGenerateCaptions() {
    setGenError(null);
    setGenResult(null);
    if (!selectedFlavorId) {
      setGenError("Select a humor flavor first.");
      return;
    }
    const img = images.find(i => String(i.id) === selectedImageId);
    const url = img?.url?.trim();
    if (!url) {
      setGenError("Pick a test image with a URL.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ humorFlavorId: selectedFlavorId, imageUrl: url })
      });
      const json = await res.json();
      if (!res.ok) {
        setGenError(json.error ?? JSON.stringify(json));
        return;
      }
      setGenResult(JSON.stringify(json, null, 2));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const sortedSteps = useMemo(() => {
    return [...steps].sort((a, b) => {
      const na = Number(a.humor_flavor_step_type_id);
      const nb = Number(b.humor_flavor_step_type_id);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
      return String(a.humor_flavor_step_type_id).localeCompare(String(b.humor_flavor_step_type_id));
    });
  }, [steps]);

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-brand-800/30 bg-brand-800 px-4 py-3 text-sm text-white shadow-lg dark:border-brand-600/40 dark:bg-brand-900">
          {toast}
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
          <h2 className="section-title">Humor flavors</h2>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          {flavorLoading && <p className="text-sm text-slate-500">Loading flavors…</p>}
          {flavorError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {flavorError}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-400">
              Active flavor
            </span>
            <select
              className="input"
              value={selectedFlavorId}
              onChange={e => setSelectedFlavorId(e.target.value)}
            >
              <option value="">— Select —</option>
              {flavors.map(f => (
                <option key={String(f.id)} value={String(f.id)}>
                  {(f.description || f.slug || f.id) as string}
                </option>
              ))}
            </select>
          </label>

          <form className="space-y-3" onSubmit={handleCreateFlavor}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Create flavor</h3>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Description</span>
              <input
                className="input"
                value={newFlavorDesc}
                onChange={e => setNewFlavorDesc(e.target.value)}
                placeholder="e.g. Sarcastic sports captions"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Slug (optional)</span>
              <input
                className="input"
                value={newFlavorSlug}
                onChange={e => setNewFlavorSlug(e.target.value)}
                placeholder="auto-generated if empty"
              />
            </label>
            <button type="submit" disabled={busy} className="btn-primary">
              Create flavor
            </button>
          </form>

          {selectedFlavorId && (
            <form className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700" onSubmit={handleUpdateFlavor}>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Edit selected flavor</h3>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Description</span>
                <input className="input" value={editFlavorDesc} onChange={e => setEditFlavorDesc(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Slug</span>
                <input className="input" value={editFlavorSlug} onChange={e => setEditFlavorSlug(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy} className="btn-primary">
                  Save changes
                </button>
                <button type="button" className="btn-danger" disabled={busy} onClick={handleDeleteFlavor}>
                  Delete flavor
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
          <h2 className="section-title">Flavor steps (prompt chain)</h2>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          {!selectedFlavorId && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a flavor to manage steps.</p>
          )}
          {selectedFlavorId && stepsLoading && <p className="text-sm text-slate-500">Loading steps…</p>}
          {stepsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {stepsError}
            </div>
          )}

          {selectedFlavorId && !stepsLoading && (
            <>
              <ol className="list-decimal space-y-6 pl-5">
                {sortedSteps.map((step, idx) => (
                  <li key={String(step.id)} className="marker:text-brand-600 dark:marker:text-brand-400">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="pill">type {step.humor_flavor_step_type_id}</span>
                      <span className="text-xs text-slate-500">row #{String(step.id)}</span>
                      <span className="flex-1" />
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        disabled={busy || idx === 0}
                        onClick={() => reorderStep(idx, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        disabled={busy || idx === sortedSteps.length - 1}
                        onClick={() => reorderStep(idx, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        disabled={busy}
                        onClick={() => beginEditStep(step)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger-sm"
                        disabled={busy}
                        onClick={() => deleteStep(String(step.id))}
                      >
                        Delete
                      </button>
                    </div>
                    {step.description && (
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{step.description}</p>
                    )}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                          System prompt
                        </div>
                        <pre className="prompt-pre">{step.llm_system_prompt || "—"}</pre>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                          User prompt
                        </div>
                        <pre className="prompt-pre">{step.llm_user_prompt || "—"}</pre>
                      </div>
                    </div>

                    {editingStepId === String(step.id) && (
                      <div className="mt-4 space-y-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Step type</span>
                          <select
                            className="input"
                            value={editStepTypeId}
                            onChange={e => setEditStepTypeId(e.target.value)}
                          >
                            {stepTypes.map(t => (
                              <option key={String(t.id)} value={String(t.id)}>
                                {stepTypeLabel(t)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Description</span>
                          <input className="input" value={editStepDesc} onChange={e => setEditStepDesc(e.target.value)} />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">System prompt</span>
                          <textarea className="input" rows={4} value={editStepSys} onChange={e => setEditStepSys(e.target.value)} />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">User prompt</span>
                          <textarea className="input" rows={4} value={editStepUser} onChange={e => setEditStepUser(e.target.value)} />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy} onClick={saveEditStep} className="btn-primary">
                            Save step
                          </button>
                          <button type="button" onClick={() => setEditingStepId(null)} className="btn-ghost">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              <form className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700" onSubmit={handleCreateStep}>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add step</h3>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Step type</span>
                  <select
                    className="input"
                    value={newStepTypeId}
                    onChange={e => setNewStepTypeId(e.target.value)}
                  >
                    {stepTypes.length === 0 && <option value="">No step types loaded</option>}
                    {stepTypes.map(t => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {stepTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Description (optional)</span>
                  <input className="input" value={newStepDesc} onChange={e => setNewStepDesc(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM system prompt</span>
                  <textarea className="input" rows={3} value={newStepSys} onChange={e => setNewStepSys(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM user prompt</span>
                  <textarea className="input" rows={3} value={newStepUser} onChange={e => setNewStepUser(e.target.value)} />
                </label>
                <button type="submit" disabled={busy || !stepTypes.length} className="btn-primary">
                  Add step
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
          <h2 className="section-title">Test captions (REST)</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Server POSTs to <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">CAPTION_API_URL</code> with{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">image_url</code>,{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">humor_flavor_id</code>, and ordered{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">steps</code>. Adjust env vars to match your course
            API.
          </p>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
              Test image from images
            </span>
            {imagesLoading && <p className="text-sm text-slate-500">Loading images…</p>}
            {imagesError && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {imagesError}
              </p>
            )}
            <select
              className="input mt-1"
              value={selectedImageId}
              onChange={e => setSelectedImageId(e.target.value)}
            >
              <option value="">— Pick an image —</option>
              {images.map(img => (
                <option key={img.id} value={String(img.id)}>
                  {String(img.id).slice(0, 8)}… {img.url ? img.url.slice(0, 48) + "…" : "(no url)"}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            {images.slice(0, 12).map(img => (
              <button
                key={img.id}
                type="button"
                className={[
                  "overflow-hidden rounded-2xl border-2 bg-slate-100 p-0 transition dark:bg-slate-900",
                  selectedImageId === String(img.id)
                    ? "border-brand-500 ring-2 ring-brand-500/40"
                    : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                ].join(" ")}
                onClick={() => setSelectedImageId(String(img.id))}
                title={img.url ?? ""}
              >
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={img.url} width={72} height={72} className="h-[72px] w-[72px] object-cover" />
                ) : (
                  <span className="flex h-[72px] w-[72px] items-center justify-center text-xs text-slate-500">no url</span>
                )}
              </button>
            ))}
          </div>

          <button type="button" disabled={busy} onClick={runGenerateCaptions} className="btn-primary">
            Generate captions
          </button>

          {genError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">{genError}</p>
          )}
          {genResult && <pre className="json-out">{genResult}</pre>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
          <h2 className="section-title">Captions for this flavor (optional)</h2>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reads <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">captions</code> where{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">humor_flavor_id</code> matches. If your schema differs, ignore this block.
          </p>
          {captionsError && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{captionsError}</p>
          )}
          {captionsPreview && captionsPreview.length === 0 && <p className="text-sm text-slate-500">No rows found.</p>}
          {captionsPreview && captionsPreview.length > 0 && (
            <pre className="json-out">{JSON.stringify(captionsPreview, null, 2)}</pre>
          )}
        </div>
      </section>
    </div>
  );
}
