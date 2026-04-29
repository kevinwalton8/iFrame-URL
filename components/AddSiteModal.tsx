"use client";

import { useState, useRef } from "react";
import type { Site, Category, Collection } from "@/lib/db";

type Props = {
  categories: Category[];
  collections?: Collection[];
  /** Pre-checked collection IDs when creating a new site (e.g. on a /c/[id] page) */
  defaultCollectionIds?: string[];
  initialSite?: Site;
  onAdd?: (data: Omit<Site, "id" | "createdAt">) => Promise<void>;
  onUpdate?: (id: string, data: Omit<Site, "id" | "createdAt">) => Promise<void>;
  onClose: () => void;
  onCreateCategory: (name: string) => Promise<void>;
};

export default function AddSiteModal({
  categories,
  collections = [],
  defaultCollectionIds = [],
  initialSite,
  onAdd,
  onUpdate,
  onClose,
  onCreateCategory,
}: Props) {
  const isEditing = !!initialSite;

  const [title, setTitle] = useState(initialSite?.title ?? "");
  const [url, setUrl] = useState(initialSite?.url ?? "");
  const [description, setDescription] = useState(initialSite?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initialSite?.imageUrl ?? "");
  const [category, setCategory] = useState(
    initialSite?.category ?? categories[0]?.name ?? "Uncategorized"
  );
  const [tags, setTags] = useState(initialSite?.tags?.join(", ") ?? "");

  // Collection assignment — when editing, use the site's existing collections;
  // when creating, pre-fill with the current page's collection (if any).
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    () => new Set(initialSite?.collections ?? defaultCollectionIds)
  );

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [uploadPreview, setUploadPreview] = useState<string>(initialSite?.imageUrl ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleCollection(id: string) {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleFetch() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setUploadPreview(data.imageUrl);
      }
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
    } catch {
      setFetchError("Failed to fetch. Try entering the image URL manually.");
    } finally {
      setFetching(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImageUrl(result);
      setUploadPreview(result);
    };
    reader.readAsDataURL(file);
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

    const payload = {
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      category: category || "Uncategorized",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      collections: Array.from(selectedCollections),
    };

    if (isEditing && onUpdate) {
      await onUpdate(initialSite!.id, payload);
    } else if (onAdd) {
      await onAdd(payload);
    }
    setSubmitting(false);
  }

  const previewSrc = imageMode === "upload" ? uploadPreview : imageUrl;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold">{isEditing ? "Edit Site" : "Add New Site"}</h2>
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

          {/* Image section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Thumbnail
              </label>
              <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`px-3 py-1 transition-colors ${
                    imageMode === "url" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`px-3 py-1 transition-colors ${
                    imageMode === "upload" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>

            {imageMode === "url" ? (
              <input
                type="text"
                placeholder="Image URL (or use Fetch)"
                value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setUploadPreview(e.target.value); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 bg-white/5 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-white/40 hover:bg-white/8 transition-colors"
              >
                <UploadIcon />
                <span className="text-xs text-white/40">Click to choose a file</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Preview */}
            {previewSrc && (
              <div className="mt-2 relative rounded-xl overflow-hidden h-28 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageUrl(""); setUploadPreview(""); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            )}
          </div>

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

          {/* Collections */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">
              Collections
            </label>
            {collections.length === 0 ? (
              <p className="text-xs text-white/40 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
                No collections yet. Create one from <span className="text-white/60">Settings → Collections</span>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {collections.map((c) => {
                  const checked = selectedCollections.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCollection(c.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
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
            )}
            {collections.length > 0 && (
              <p className="text-[10px] text-white/30 mt-1.5">
                Tap to toggle. This site appears wherever you tag it.
              </p>
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
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Add Site"}
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

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
