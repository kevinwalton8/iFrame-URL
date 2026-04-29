"use client";

import { useState } from "react";
import type { Site, Category, Collection } from "@/lib/db";

type Props = {
  categories: Category[];
  collections?: Collection[];
  /** Pre-checked collection IDs (e.g. when on a /c/[id] page) */
  defaultCollectionIds?: string[];
  companyId: string;
  defaultCategory?: string;
  onAdd: (data: Omit<Site, "id" | "createdAt">) => Promise<void>;
  onClose: () => void;
  onCreateCategory: (name: string) => Promise<void>;
};

type Status = "idle" | "fetching" | "saving" | "done" | "error";

export default function QuickAddModal({
  categories,
  collections = [],
  defaultCollectionIds = [],
  companyId,
  defaultCategory,
  onAdd,
  onClose,
  onCreateCategory,
}: Props) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(
    defaultCategory ?? categories[0]?.name ?? "Uncategorized"
  );
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    () => new Set(defaultCollectionIds)
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Preview state while fetching
  const [preview, setPreview] = useState<{ title: string; imageUrl: string; description: string } | null>(null);

  function toggleCollection(id: string) {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("fetching");
    setErrorMsg("");
    setPreview(null);

    try {
      const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      const fetched = {
        title: data.title ?? new URL(url).hostname,
        imageUrl: data.imageUrl ?? "",
        description: data.description ?? "",
      };
      setPreview(fetched);
      setStatus("saving");

      await onAdd({
        title: fetched.title,
        url: url.trim(),
        description: fetched.description,
        imageUrl: fetched.imageUrl,
        category: category || "Uncategorized",
        tags: [],
        collections: Array.from(selectedCollections),
      });

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add site");
      setStatus("error");
    }
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    await onCreateCategory(newCatName.trim());
    setCategory(newCatName.trim());
    setNewCatMode(false);
    setNewCatName("");
  }

  const loading = status === "fetching" || status === "saving";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-base font-semibold">Quick Add</h2>
            <p className="text-xs text-white/40 mt-0.5">Paste a URL — we&apos;ll fetch everything else</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleQuickAdd} className="px-5 pb-5 space-y-3">
          {/* URL */}
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setStatus("idle"); setPreview(null); }}
            required
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />

          {/* Category */}
          {newCatMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
              <button type="button" onClick={handleCreateCategory}
                className="px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-colors">
                Add
              </button>
              <button type="button" onClick={() => { setNewCatMode(false); setNewCatName(""); }}
                className="px-3 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors">
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 appearance-none"
              >
                {categories.length === 0 && <option value="Uncategorized">Uncategorized</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNewCatMode(true)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors text-lg leading-none"
                aria-label="New category"
              >+</button>
            </div>
          )}

          {/* Collections */}
          {collections.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">
                Collections
              </label>
              <div className="flex flex-wrap gap-1.5">
                {collections.map((c) => {
                  const checked = selectedCollections.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCollection(c.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        checked
                          ? "bg-white text-black border-white"
                          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {checked && <span className="mr-1">✓</span>}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live fetch preview */}
          {preview && (
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
              {preview.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{preview.title}</p>
                {preview.description && (
                  <p className="text-xs text-white/40 truncate">{preview.description}</p>
                )}
              </div>
              <CheckIcon />
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <p className="text-red-400 text-xs">{errorMsg || "Something went wrong. Try again."}</p>
          )}

          {/* Status label */}
          {loading && (
            <p className="text-white/40 text-xs flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin inline-block" />
              {status === "fetching" ? "Fetching site info…" : "Saving…"}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <BoltIcon />
              )}
              Quick Add
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400 flex-shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
