"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type HumorFlavor = {
  id: number | string;
  description?: string | null;
  slug?: string | null;
  created_datetime_utc?: string | null;
};

function slugFromFlavorDescription(desc: string) {
  return desc
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function FlavorHome() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [newFlavorDesc, setNewFlavorDesc] = useState("");
  const [newFlavorSlug, setNewFlavorSlug] = useState("");

  const loadFlavors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qError } = await supabase
      .from("humor_flavors")
      .select("*")
      .order("created_datetime_utc", { ascending: false });
    if (qError) {
      setError(qError.message);
      setFlavors([]);
    } else {
      setFlavors((data as HumorFlavor[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadFlavors();
  }, [loadFlavors]);

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
    const slug = newFlavorSlug.trim() || slugFromFlavorDescription(newFlavorDesc);
    const { data, error: insertError } = await supabase
      .from("humor_flavors")
      .insert({ description: newFlavorDesc.trim(), slug })
      .select("*")
      .single();
    setBusy(false);
    if (insertError) {
      showToast(insertError.message);
      return;
    }
    setNewFlavorDesc("");
    setNewFlavorSlug("");
    await loadFlavors();
    if (data?.id != null) {
      router.push(`/flavor/${data.id}`);
    }
    showToast("Flavor created.");
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-brand-800/30 bg-brand-800 px-4 py-3 text-sm text-white shadow-lg dark:border-brand-600/40 dark:bg-brand-900">
          {toast}
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="border-b-2 border-black bg-white px-4 py-3">
          <h2 className="section-title">Create flavor</h2>
        </div>
        <div className="p-4 sm:p-5">
          <form className="flex flex-wrap gap-2" onSubmit={handleCreateFlavor}>
            <input
              className="input min-w-0 flex-1"
              value={newFlavorDesc}
              onChange={e => setNewFlavorDesc(e.target.value)}
              placeholder="e.g. Sarcastic sports captions"
              autoComplete="off"
            />
            <button type="submit" disabled={busy} className="btn-primary shrink-0">
              Create and open
            </button>
          </form>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b-2 border-black bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Choose a flavor</h2>
            {!loading && flavors.length > 0 && (
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
                {search
                  ? `${flavors.filter(f => (f.description || f.slug || String(f.id)).toLowerCase().includes(search.toLowerCase())).length} of ${flavors.length}`
                  : `${flavors.length} flavors`}
              </span>
            )}
          </div>
          <div className="mt-2">
            <input
              type="search"
              className="input"
              placeholder="Search flavors…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {loading && <p className="text-sm text-slate-500">Loading flavors…</p>}
          {error && (
            <div className="border-2 border-black bg-black px-4 py-3 text-sm text-white">
              {error}
            </div>
          )}
          {!loading && !error && flavors.length === 0 && (
            <p className="text-sm text-slate-500">No flavors yet. Create one below.</p>
          )}
          {(() => {
            const q = search.trim().toLowerCase();
            const filtered = q
              ? flavors.filter(f =>
                  (f.description || f.slug || String(f.id)).toLowerCase().includes(q)
                )
              : flavors;
            if (!loading && flavors.length > 0 && filtered.length === 0) {
              return (
                <p className="text-sm text-slate-500">
                  No flavors match &ldquo;{search}&rdquo;.
                </p>
              );
            }
            return (
              <ul className="grid gap-2 overflow-y-auto sm:grid-cols-2" style={{ maxHeight: "30rem" }}>
                {filtered.map(f => {
                  const label = (f.description || f.slug || String(f.id)) as string;
                  return (
                    <li key={String(f.id)}>
                      <Link
                        href={`/flavor/${f.id}`}
                        className="flex items-center justify-between border-2 border-black bg-white px-4 py-3 text-left text-sm font-medium text-black transition hover:bg-black hover:text-white"
                      >
                        <span className="line-clamp-2 pr-2">{label}</span>
                        <span className="shrink-0 text-[0.65rem] font-black uppercase tracking-widest text-red-800">
                          Open →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
      </section>

    </div>
  );
}
