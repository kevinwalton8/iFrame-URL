"use client";

import { useState } from "react";
import type { Site, Category } from "@/lib/db";

type Props = {
  categories: Category[];
  onAdd: (data: Omit<Site, "id" | "createdAt">) => Promise<void>;
  onClose: () => void;
  onCreateCategory: (name: string) => Promise<void>;
};

export default function AddSiteModal({ categories, onAdd, onClose, onCreateCategory }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "Uncategorized");
  const [tags, setTags] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  async function handleFetch() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.imageUrl) setImageUrl(data.imageUrl);
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
    } catch {
      setFetchError("Failed to fetch. Try entering the image URL manually.");
    } finally {
      setFetching(false);
    }
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    await onCreateCategory(newCatName.trim());
    setCategory(newCatName.trim());
    setNewCatMode(false);
    setNewCatName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSubmitting(true);
    await onAdd({
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      category: category || "Uncategorized",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold">Add New Site</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          {/* Title */}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />

          {/* URL + Fetch */}
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={handleFetch}
              disabled={fetching || !url.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-xl text-sm text-white/80 transition-colors whitespace-nowrap"
            >
              {fetching ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ImageIcon />
              )}
              Fetch
            </button>
          </div>
          {fetchError && <p className="text-red-400 text-xs">{fetchError}</p>}

          {/* Description */}
          <input
            type="text"
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />

          {/* Image URL */}
          <input
            type="text"
            placeholder="Image URL (or use Fetch)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">
              Category
            </label>
            {newCatMode ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setNewCatMode(false); setNewCatName(""); }}
                  className="px-3 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 appearance-none"
                >
                  {categories.length === 0 && (
                    <option value="Uncategorized">Uncategorized</option>
                  )}
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setNewCatMode(true)}
                  className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors text-xl leading-none"
                  aria-label="New category"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">
              Tags
            </label>
            <input
              type="text"
              placeholder="Button, Header, Animation..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !url.trim()}
              className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-white/90 disabled:opacity-40 transition-colors"
            >
              {submitting ? "Adding..." : "Add Site"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
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

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
