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
  llm_input_type_id?: number | string | null;
  llm_output_type_id?: number | string | null;
  llm_model_id?: number | string | null;
  order_by?: number | null;
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

/** Stable `select` value when options load async (avoids effect sync loops). */
function coalesceTypeSelectValue(current: string, rows: StepTypeRow[]) {
  if (current && rows.some(t => String(t.id) === current)) return current;
  return rows[0] ? String(rows[0].id) : "";
}

/** Pull caption strings from /api/generate-captions JSON (pipeline `upstream` array or similar). */
function extractCaptionsFromGenerateResponse(json: unknown): { id?: string; content?: string }[] {
  if (!json || typeof json !== "object") return [];
  const upstream = (json as Record<string, unknown>).upstream;
  if (!Array.isArray(upstream)) return [];
  return upstream.map((item, i) => {
    if (!item || typeof item !== "object") return { id: `row-${i}`, content: undefined };
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : undefined;
    const content = typeof row.content === "string" ? row.content : undefined;
    return { id, content };
  });
}

function compareStepsByChainOrder(a: HumorFlavorStep, b: HumorFlavorStep) {
  const oa = a.order_by == null ? NaN : Number(a.order_by);
  const ob = b.order_by == null ? NaN : Number(b.order_by);
  if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob;
  const na = Number(a.humor_flavor_step_type_id);
  const nb = Number(b.humor_flavor_step_type_id);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return String(a.humor_flavor_step_type_id).localeCompare(String(b.humor_flavor_step_type_id));
}

export function PromptChainTool() {
  const supabase = useMemo(() => createClient(), []);

  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [flavorLoading, setFlavorLoading] = useState(true);
  const [flavorError, setFlavorError] = useState<string | null>(null);

  const [stepTypes, setStepTypes] = useState<StepTypeRow[]>([]);
  const [inputTypes, setInputTypes] = useState<StepTypeRow[]>([]);
  const [outputTypes, setOutputTypes] = useState<StepTypeRow[]>([]);
  const [inputTypesError, setInputTypesError] = useState<string | null>(null);
  const [outputTypesError, setOutputTypesError] = useState<string | null>(null);
  const [llmModels, setLlmModels] = useState<StepTypeRow[]>([]);
  const [llmModelsError, setLlmModelsError] = useState<string | null>(null);

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
  const [newLlmInputTypeId, setNewLlmInputTypeId] = useState<string>("");
  const [newLlmOutputTypeId, setNewLlmOutputTypeId] = useState<string>("");
  const [newLlmModelId, setNewLlmModelId] = useState<string>("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepSys, setNewStepSys] = useState("");
  const [newStepUser, setNewStepUser] = useState("");

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepDesc, setEditStepDesc] = useState("");
  const [editStepSys, setEditStepSys] = useState("");
  const [editStepUser, setEditStepUser] = useState("");
  const [editStepTypeId, setEditStepTypeId] = useState<string>("");
  const [editLlmInputTypeId, setEditLlmInputTypeId] = useState<string>("");
  const [editLlmOutputTypeId, setEditLlmOutputTypeId] = useState<string>("");
  const [editLlmModelId, setEditLlmModelId] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [genError, setGenError] = useState<string | null>(null);
  const [genPreviewImageUrl, setGenPreviewImageUrl] = useState<string | null>(null);
  const [genCaptionRows, setGenCaptionRows] = useState<{ id?: string; content?: string }[]>([]);

  const [captionsPreview, setCaptionsPreview] = useState<unknown[] | null>(null);
  const [captionsError, setCaptionsError] = useState<string | null>(null);

  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);
  const [duplicateFormDesc, setDuplicateFormDesc] = useState("");
  const [duplicateFormSlug, setDuplicateFormSlug] = useState("");

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

  const loadInputTypes = useCallback(async () => {
    setInputTypesError(null);
    const { data, error } = await supabase.from("llm_input_types").select("*").order("id", { ascending: true });
    if (!error && data) {
      setInputTypes(data as StepTypeRow[]);
    } else {
      setInputTypes([]);
      if (error) setInputTypesError(error.message);
    }
  }, [supabase]);

  const loadOutputTypes = useCallback(async () => {
    setOutputTypesError(null);
    const { data, error } = await supabase.from("llm_output_types").select("*").order("id", { ascending: true });
    if (!error && data) {
      setOutputTypes(data as StepTypeRow[]);
    } else {
      setOutputTypes([]);
      if (error) setOutputTypesError(error.message);
    }
  }, [supabase]);

  const loadLlmModels = useCallback(async () => {
    setLlmModelsError(null);
    const { data, error } = await supabase.from("llm_models").select("*").order("id", { ascending: true });
    if (!error && data) {
      setLlmModels(data as StepTypeRow[]);
    } else {
      setLlmModels([]);
      if (error) setLlmModelsError(error.message);
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
        .order("order_by", { ascending: true })
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
    void loadInputTypes();
    void loadOutputTypes();
    void loadLlmModels();
    void loadImages();
  }, [loadFlavors, loadStepTypes, loadInputTypes, loadOutputTypes, loadLlmModels, loadImages]);

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

  const effectiveNewStepTypeId = coalesceTypeSelectValue(newStepTypeId, stepTypes);
  const effectiveNewLlmInputTypeId = coalesceTypeSelectValue(newLlmInputTypeId, inputTypes);
  const effectiveNewLlmOutputTypeId = coalesceTypeSelectValue(newLlmOutputTypeId, outputTypes);
  const effectiveNewLlmModelId = coalesceTypeSelectValue(newLlmModelId, llmModels);

  const effectiveEditStepTypeId = coalesceTypeSelectValue(editStepTypeId, stepTypes);
  const effectiveEditLlmInputTypeId = coalesceTypeSelectValue(editLlmInputTypeId, inputTypes);
  const effectiveEditLlmOutputTypeId = coalesceTypeSelectValue(editLlmOutputTypeId, outputTypes);
  const effectiveEditLlmModelId = coalesceTypeSelectValue(editLlmModelId, llmModels);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function slugFromFlavorDescription(desc: string) {
    return desc
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreateFlavor(e: React.FormEvent) {
    e.preventDefault();
    if (!newFlavorDesc.trim()) {
      showToast("Description is required.");
      return;
    }
    setBusy(true);
    const slug = newFlavorSlug.trim() || slugFromFlavorDescription(newFlavorDesc);
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

  function openDuplicateModal() {
    if (!selectedFlavorId || !selectedFlavor) return;
    const base =
      (selectedFlavor.description || selectedFlavor.slug || `Flavor ${selectedFlavor.id}`).trim() || "Flavor";
    setDuplicateSourceId(selectedFlavorId);
    setDuplicateFormDesc(`${base} (copy)`);
    setDuplicateFormSlug("");
    setDuplicateModalOpen(true);
  }

  function closeDuplicateModal() {
    setDuplicateModalOpen(false);
    setDuplicateSourceId(null);
  }

  async function handleDuplicateModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!duplicateFormDesc.trim()) {
      showToast("Description is required.");
      return;
    }
    const sourceId = duplicateSourceId;
    if (!sourceId) return;

    setBusy(true);
    const { data: stepRows, error: stepsLoadError } = await supabase
      .from("humor_flavor_steps")
      .select(
        "humor_flavor_step_type_id, description, llm_system_prompt, llm_user_prompt, order_by, llm_input_type_id, llm_output_type_id, llm_model_id"
      )
      .eq("humor_flavor_id", sourceId)
      .order("order_by", { ascending: true })
      .order("humor_flavor_step_type_id", { ascending: true });

    if (stepsLoadError) {
      setBusy(false);
      showToast(stepsLoadError.message);
      return;
    }

    const newDescription = duplicateFormDesc.trim();
    const slug = duplicateFormSlug.trim() || slugFromFlavorDescription(newDescription);

    const { data: newFlavor, error: insertFlavorError } = await supabase
      .from("humor_flavors")
      .insert({ description: newDescription, slug })
      .select("*")
      .single();

    if (insertFlavorError) {
      setBusy(false);
      showToast(insertFlavorError.message);
      return;
    }

    const newId = newFlavor?.id;
    if (newId == null) {
      setBusy(false);
      showToast("Duplicate failed: no new flavor id.");
      return;
    }

    const rows = stepRows ?? [];
    const fallbackInputTypeId = inputTypes[0]?.id;
    const fallbackOutputTypeId = outputTypes[0]?.id;
    const fallbackModelId = llmModels[0]?.id;
    if (
      rows.length > 0 &&
      rows.some(r => r.llm_input_type_id == null || r.llm_input_type_id === "") &&
      fallbackInputTypeId == null
    ) {
      setBusy(false);
      showToast("Cannot copy steps: missing llm_input_type_id and llm_input_types is empty.");
      return;
    }
    if (
      rows.length > 0 &&
      rows.some(r => r.llm_output_type_id == null || r.llm_output_type_id === "") &&
      fallbackOutputTypeId == null
    ) {
      setBusy(false);
      showToast("Cannot copy steps: missing llm_output_type_id and llm_output_types is empty.");
      return;
    }
    if (
      rows.length > 0 &&
      rows.some(r => r.llm_model_id == null || r.llm_model_id === "") &&
      fallbackModelId == null
    ) {
      setBusy(false);
      showToast("Cannot copy steps: missing llm_model_id and llm_models is empty.");
      return;
    }
    if (rows.length > 0) {
      const { error: insertStepsError } = await supabase.from("humor_flavor_steps").insert(
        rows.map((r, i) => ({
          humor_flavor_id: newId,
          humor_flavor_step_type_id: r.humor_flavor_step_type_id,
          llm_input_type_id:
            r.llm_input_type_id != null && r.llm_input_type_id !== ""
              ? r.llm_input_type_id
              : fallbackInputTypeId,
          llm_output_type_id:
            r.llm_output_type_id != null && r.llm_output_type_id !== ""
              ? r.llm_output_type_id
              : fallbackOutputTypeId,
          llm_model_id:
            r.llm_model_id != null && r.llm_model_id !== "" ? r.llm_model_id : fallbackModelId,
          order_by:
            r.order_by != null && Number.isFinite(Number(r.order_by))
              ? Number(r.order_by)
              : i + 1,
          description: r.description ?? null,
          llm_system_prompt: r.llm_system_prompt ?? null,
          llm_user_prompt: r.llm_user_prompt ?? null
        }))
      );
      if (insertStepsError) {
        await supabase.from("humor_flavors").delete().eq("id", newId);
        setBusy(false);
        showToast(insertStepsError.message);
        return;
      }
    }

    closeDuplicateModal();
    await loadFlavors();
    setSelectedFlavorId(String(newId));
    setBusy(false);
    showToast("Flavor duplicated.");
  }

  async function handleCreateStep(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlavorId || !effectiveNewStepTypeId) return;
    if (!effectiveNewLlmInputTypeId) {
      showToast("Select an LLM input type (or wait for types to load).");
      return;
    }
    if (!effectiveNewLlmOutputTypeId) {
      showToast("Select an LLM output type (or wait for types to load).");
      return;
    }
    if (!effectiveNewLlmModelId) {
      showToast("Select an LLM model (or wait for models to load).");
      return;
    }
    setBusy(true);
    const numericOrders = steps.map(s => Number(s.order_by)).filter(n => Number.isFinite(n));
    const nextOrderBy = numericOrders.length === 0 ? 1 : Math.max(...numericOrders) + 1;
    const { error } = await supabase.from("humor_flavor_steps").insert({
      humor_flavor_id: selectedFlavorId,
      humor_flavor_step_type_id: effectiveNewStepTypeId,
      llm_input_type_id: effectiveNewLlmInputTypeId,
      llm_output_type_id: effectiveNewLlmOutputTypeId,
      llm_model_id: effectiveNewLlmModelId,
      order_by: nextOrderBy,
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
    setEditLlmInputTypeId(
      step.llm_input_type_id != null && step.llm_input_type_id !== ""
        ? String(step.llm_input_type_id)
        : inputTypes[0]
          ? String(inputTypes[0].id)
          : ""
    );
    setEditLlmOutputTypeId(
      step.llm_output_type_id != null && step.llm_output_type_id !== ""
        ? String(step.llm_output_type_id)
        : outputTypes[0]
          ? String(outputTypes[0].id)
          : ""
    );
    setEditLlmModelId(
      step.llm_model_id != null && step.llm_model_id !== ""
        ? String(step.llm_model_id)
        : llmModels[0]
          ? String(llmModels[0].id)
          : ""
    );
  }

  async function saveEditStep() {
    if (!editingStepId || !selectedFlavorId) return;
    if (!effectiveEditLlmInputTypeId) {
      showToast("Select an LLM input type.");
      return;
    }
    if (!effectiveEditLlmOutputTypeId) {
      showToast("Select an LLM output type.");
      return;
    }
    if (!effectiveEditLlmModelId) {
      showToast("Select an LLM model.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("humor_flavor_steps")
      .update({
        description: editStepDesc.trim() || null,
        llm_system_prompt: editStepSys.trim() || null,
        llm_user_prompt: editStepUser.trim() || null,
        humor_flavor_step_type_id: effectiveEditStepTypeId,
        llm_input_type_id: effectiveEditLlmInputTypeId,
        llm_output_type_id: effectiveEditLlmOutputTypeId,
        llm_model_id: effectiveEditLlmModelId
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

  /** Swap `order_by` on adjacent rows so chain order matches the database column. */
  async function reorderStep(fromIndex: number, direction: -1 | 1) {
    if (!selectedFlavorId) return;
    const ordered = [...steps].sort(compareStepsByChainOrder);
    const j = fromIndex + direction;
    if (j < 0 || j >= ordered.length) return;

    const a = ordered[fromIndex];
    const b = ordered[j];
    const oa = Number(a.order_by);
    const ob = Number(b.order_by);
    if (!Number.isFinite(oa) || !Number.isFinite(ob)) {
      showToast("Cannot reorder: steps are missing order_by. Re-save or fix rows in the database.");
      return;
    }

    setBusy(true);
    const r1 = await supabase.from("humor_flavor_steps").update({ order_by: ob }).eq("id", a.id);
    if (r1.error) {
      setBusy(false);
      showToast(r1.error.message);
      return;
    }
    const r2 = await supabase.from("humor_flavor_steps").update({ order_by: oa }).eq("id", b.id);
    setBusy(false);
    if (r2.error) {
      showToast(r2.error.message);
      return;
    }
    await loadSteps(selectedFlavorId);
    showToast("Order updated.");
  }

  async function runGenerateCaptions() {
    setGenError(null);
    setGenPreviewImageUrl(null);
    setGenCaptionRows([]);
    if (!selectedFlavorId) {
      setGenError("Select a humor flavor first.");
      return;
    }
    const sid = selectedImageId.trim();
    if (!sid) {
      setGenError("Pick a test image from the list or thumbnails.");
      return;
    }
    const img = images.find(i => String(i.id) === sid);
    const url = img?.url?.trim();
    if (!img || !url) {
      setGenError("Pick a test image with a URL (try selecting the image again).");
      return;
    }
    const imageId = String(img.id).trim();
    if (!imageId) {
      setGenError("This image row has no id in Supabase; fix the images table or pick another image.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          humorFlavorId: selectedFlavorId,
          imageUrl: url,
          imageId
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setGenError(json.error ?? JSON.stringify(json));
        return;
      }
      setGenPreviewImageUrl(url);
      setGenCaptionRows(extractCaptionsFromGenerateResponse(json));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const sortedSteps = useMemo(() => [...steps].sort(compareStepsByChainOrder), [steps]);

  const genCaptionsWithText = useMemo(
    () => genCaptionRows.filter(c => c.content?.trim()),
    [genCaptionRows]
  );

  const duplicateSourceFlavor = duplicateSourceId
    ? flavors.find(f => String(f.id) === duplicateSourceId)
    : null;
  const duplicateSourceLabel = duplicateSourceFlavor
    ? String(duplicateSourceFlavor.description || duplicateSourceFlavor.slug || duplicateSourceFlavor.id)
    : "";

  return (
    <div className="space-y-5">
      {duplicateModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 dark:bg-black/60"
          role="presentation"
          onClick={e => {
            if (e.target === e.currentTarget) closeDuplicateModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-flavor-title"
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3
              id="duplicate-flavor-title"
              className="text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              Duplicate flavor
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Copies all prompt-chain steps from{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {duplicateSourceLabel || (duplicateSourceId ? `#${duplicateSourceId}` : "…")}
              </span>
              . Name the new flavor like when you create one.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleDuplicateModalSubmit}>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Description</span>
                <input
                  className="input"
                  value={duplicateFormDesc}
                  onChange={e => setDuplicateFormDesc(e.target.value)}
                  placeholder="e.g. Fat cat roasts (copy)"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Slug (optional)</span>
                <input
                  className="input"
                  value={duplicateFormSlug}
                  onChange={e => setDuplicateFormSlug(e.target.value)}
                  placeholder="auto-generated if empty"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" disabled={busy} className="btn-primary">
                  Create copy
                </button>
                <button type="button" className="btn-ghost" disabled={busy} onClick={closeDuplicateModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <button type="button" className="btn-ghost" disabled={busy} onClick={openDuplicateModal}>
                  Duplicate flavor
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
          {inputTypesError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <span className="font-medium">llm_input_types</span> could not be loaded: {inputTypesError}
            </div>
          )}
          {outputTypesError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <span className="font-medium">llm_output_types</span> could not be loaded: {outputTypesError}
            </div>
          )}
          {llmModelsError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <span className="font-medium">llm_models</span> could not be loaded: {llmModelsError}
            </div>
          )}

          {selectedFlavorId && !stepsLoading && (
            <>
              <ol className="list-decimal space-y-6 pl-5">
                {sortedSteps.map((step, idx) => (
                  <li key={String(step.id)} className="marker:text-brand-600 dark:marker:text-brand-400">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="pill">type {step.humor_flavor_step_type_id}</span>
                      {step.llm_input_type_id != null && step.llm_input_type_id !== "" && (
                        <span className="pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          input{" "}
                          {stepTypeLabel(
                            inputTypes.find(t => String(t.id) === String(step.llm_input_type_id)) ?? {
                              id: step.llm_input_type_id
                            }
                          )}
                        </span>
                      )}
                      {step.llm_output_type_id != null && step.llm_output_type_id !== "" && (
                        <span className="pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          output{" "}
                          {stepTypeLabel(
                            outputTypes.find(t => String(t.id) === String(step.llm_output_type_id)) ?? {
                              id: step.llm_output_type_id
                            }
                          )}
                        </span>
                      )}
                      {step.llm_model_id != null && step.llm_model_id !== "" && (
                        <span className="pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          model{" "}
                          {stepTypeLabel(
                            llmModels.find(t => String(t.id) === String(step.llm_model_id)) ?? {
                              id: step.llm_model_id
                            }
                          )}
                        </span>
                      )}
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
                            value={effectiveEditStepTypeId}
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
                          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM input type</span>
                          <select
                            className="input"
                            value={effectiveEditLlmInputTypeId}
                            onChange={e => setEditLlmInputTypeId(e.target.value)}
                          >
                            {inputTypes.length === 0 && <option value="">No input types loaded</option>}
                            {inputTypes.map(t => (
                              <option key={String(t.id)} value={String(t.id)}>
                                {stepTypeLabel(t)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM output type</span>
                          <select
                            className="input"
                            value={effectiveEditLlmOutputTypeId}
                            onChange={e => setEditLlmOutputTypeId(e.target.value)}
                          >
                            {outputTypes.length === 0 && <option value="">No output types loaded</option>}
                            {outputTypes.map(t => (
                              <option key={String(t.id)} value={String(t.id)}>
                                {stepTypeLabel(t)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM model</span>
                          <select
                            className="input"
                            value={effectiveEditLlmModelId}
                            onChange={e => setEditLlmModelId(e.target.value)}
                          >
                            {llmModels.length === 0 && <option value="">No models loaded</option>}
                            {llmModels.map(t => (
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
                          <button
                            type="button"
                            disabled={busy || !inputTypes.length || !outputTypes.length || !llmModels.length}
                            onClick={saveEditStep}
                            className="btn-primary"
                          >
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
                    value={effectiveNewStepTypeId}
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
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM input type</span>
                  <select
                    className="input"
                    value={effectiveNewLlmInputTypeId}
                    onChange={e => setNewLlmInputTypeId(e.target.value)}
                  >
                    {inputTypes.length === 0 && <option value="">No input types loaded</option>}
                    {inputTypes.map(t => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {stepTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM output type</span>
                  <select
                    className="input"
                    value={effectiveNewLlmOutputTypeId}
                    onChange={e => setNewLlmOutputTypeId(e.target.value)}
                  >
                    {outputTypes.length === 0 && <option value="">No output types loaded</option>}
                    {outputTypes.map(t => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {stepTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">LLM model</span>
                  <select
                    className="input"
                    value={effectiveNewLlmModelId}
                    onChange={e => setNewLlmModelId(e.target.value)}
                  >
                    {llmModels.length === 0 && <option value="">No models loaded</option>}
                    {llmModels.map(t => (
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
                <button
                  type="submit"
                  disabled={busy || !stepTypes.length || !inputTypes.length || !outputTypes.length || !llmModels.length}
                  className="btn-primary"
                >
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
            By default the server calls Almost Crack’d{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              /pipeline/generate-captions
            </code>{" "}
            with your Supabase session token and{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">imageId</code> (same as{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">humorproject</code> upload flow). Set{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">CAPTION_API_URL</code> to a different URL to
            POST <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">image_url</code>,{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">humor_flavor_id</code>, and{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">steps</code> instead.
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

          {genPreviewImageUrl && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40 sm:p-6">
              <h3 className="text-center text-base font-semibold text-slate-900 dark:text-slate-100">
                Generated captions
              </h3>
              <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                {genCaptionsWithText.length} caption{genCaptionsWithText.length !== 1 ? "s" : ""} for your test image
              </p>
              <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="mx-auto w-full shrink-0 md:mx-0 md:w-[min(100%,320px)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={genPreviewImageUrl}
                    alt="Test image"
                    className="mx-auto max-h-[min(400px,50vh)] w-full rounded-xl border border-slate-200 object-contain dark:border-slate-600"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  {genCaptionsWithText.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300">
                      No caption text in the response. The API may return a different shape for custom{" "}
                      <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">CAPTION_API_URL</code> mode.
                    </p>
                  ) : (
                    genCaptionsWithText.map((caption, i) => (
                      <div
                        key={caption.id ?? i}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {caption.content}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
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
