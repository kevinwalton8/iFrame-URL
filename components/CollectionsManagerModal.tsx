"use client";

import { useState, useMemo } from "react";
import type { Collection } from "@/lib/db";

type Props = {
  collections: Collection[];
  currentCollectionId: string;
  onCreate: (name: string) => Promise<Collection | null>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
};

export default function CollectionsManagerModal({
  collections,
  currentCollectionId,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: Props) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  );

  // Synthesise a "Default" entry so it shows in the list alongside user-created ones
  const allEntries = useMemo(() => {
    const def: Collection = { id: "default", name: "Default", createdAt: "" };
    const others = collections.filter((c) => c.id !== "default");
    return [def, ...others];
  }, [collections]);

  function urlFor(id: string) {
    if (id === "default") return `${origin}/`;
    return `${origin}/c/${id}`;
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await onCreate(name);
      if (!created) {
        setError("Failed to create collection");
        return;
      }
      setNewName("");
    } catch {
      setError("Failed to create collection");
    } finally {
      setCreating(false);
    }
  }

  async function handleRenameSubmit(id: string) {
    const name = editName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    try {
      await onRename(id, name);
      setEditingId(null);
    } catch {
      setError("Failed to rename");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete the "${name}" collection? All sites and categories inside it will be permanently removed.`)) return;
    try {
      await onDelete(id);
    } catch {
      setError("Failed to delete");
    }
  }

  async function copyUrl(id: string) {
    const url = urlFor(id);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      // Fallback: select-and-copy via prompt
      window.prompt("Copy this URL:", url);
    }
  }

  function openCollection(id: string) {
    if (id === "default") {
      window.location.href = "/";
    } else {
      window.location.href = `/c/${id}`;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#0f0f0f] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Collections</h2>
            <p className="text-xs text-white/50 mt-0.5">
              Each collection is a separate gallery. Paste its URL into a duplicated app in Whop.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Create new */}
        <div className="px-5 py-4 border-b border-white/10">
          <label className="text-xs font-medium text-white/60 mb-2 block">
            New collection
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Mockups"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating && newName.trim()) handleCreate();
              }}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-white/90 transition-colors"
            >
              {creating ? "…" : "Create"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {allEntries.map((c) => {
            const isCurrent = c.id === currentCollectionId;
            const isDefault = c.id === "default";
            const isEditing = editingId === c.id;
            const url = urlFor(c.id);
            return (
              <div
                key={c.id}
                className={`px-5 py-4 border-b border-white/5 ${
                  isCurrent ? "bg-white/[0.04]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSubmit(c.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-white/40"
                        />
                        <button
                          onClick={() => handleRenameSubmit(c.id)}
                          className="text-xs text-white/80 hover:text-white px-2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-white/50 hover:text-white px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openCollection(c.id)}
                          className="text-sm font-semibold text-white hover:underline truncate"
                          title="Open this collection"
                        >
                          {c.name}
                        </button>
                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-wide bg-white/15 text-white px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                        {isDefault && (
                          <span className="text-[10px] uppercase tracking-wide bg-white/5 text-white/50 px-1.5 py-0.5 rounded">
                            Locked
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* URL row */}
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate text-xs text-white/50 bg-white/[0.04] px-2 py-1.5 rounded">
                    {url}
                  </code>
                  <button
                    onClick={() => copyUrl(c.id)}
                    className="flex-shrink-0 px-2.5 py-1.5 bg-white/10 text-white text-xs rounded hover:bg-white/20 transition-colors"
                  >
                    {copiedId === c.id ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Actions */}
                {!isDefault && !isEditing && (
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      className="text-xs text-white/50 hover:text-white"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-xs text-red-400/80 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/30">
          <p className="text-[11px] text-white/40 leading-relaxed">
            <strong className="text-white/60">How to use:</strong> create a collection, click <em>Copy</em>, then paste the URL into your duplicated app's iframe URL inside Whop. That duplicate will only ever show this collection's URLs.
          </p>
        </div>
      </div>
    </div>
  );
}
