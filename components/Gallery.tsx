"use client";

import { useState, useMemo, useRef } from "react";
import type { Collection } from "@/lib/db";

type Props = {
  initialCollections: Collection[];
  isAdmin: boolean;
  companyId: string;
};

export default function EmbedManager({ initialCollections, isAdmin, companyId }: Props) {
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [showAddModal, setShowAddModal] = useState(false);

  // Drag-to-reorder pill order
  const [collectionOrder, setCollectionOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("iframe-collection-order");
        if (s) return JSON.parse(s);
      } catch {}
    }
    return initialCollections.map((c) => c.id);
  });

  const dragColIdx = useRef<number | null>(null);
  const [dragColOver, setDragColOver] = useState<number | null>(null);

  const orderedCollections = useMemo(() => {
    const extra = collections.filter((c) => !collectionOrder.includes(c.id)).map((c) => c.id);
    const order = [...collectionOrder, ...extra];
    return order.map((id) => collections.find((c) => c.id === id)).filter(Boolean) as Collection[];
  }, [collectionOrder, collections]);

  function apiHeaders(): Record<string, string> {
    return { "Content-Type": "application/json", "x-company-id": companyId };
  }

  async function handleCreate(name: string, url: string): Promise<Collection | null> {
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ name, url }),
    });
    if (!res.ok) return null;
    const created: Collection = await res.json();
    setCollections((prev) => [...prev, created]);
    return created;
  }

  async function handleRename(id: string, name: string) {
    const res = await fetch("/api/collections", {
      method: "PUT",
      headers: apiHeaders(),
      body: JSON.stringify({ id, name }),
    });
    if (!res.ok) return;
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/collections", {
      method: "DELETE",
      headers: apiHeaders(),
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setCollectionOrder((prev) => prev.filter((oid) => oid !== id));
  }

  function handleColDragStart(e: React.DragEvent, idx: number) {
    dragColIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  }
  function handleColDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragColOver(idx);
  }
  function handleColDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault();
    const fromIdx = dragColIdx.current;
    dragColIdx.current = null;
    setDragColOver(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    const next = orderedCollections.map((c) => c.id);
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setCollectionOrder(next);
    if (typeof window !== "undefined")
      localStorage.setItem("iframe-collection-order", JSON.stringify(next));
  }
  function handleColDragEnd() {
    dragColIdx.current = null;
    setDragColOver(null);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-xs flex-shrink-0">
            <IframeIcon />
          </div>
          <span className="text-sm font-semibold text-white">iFrame URL</span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 h-8 bg-white text-black rounded-full text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Add New URL
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        )}
      </div>

      {/* Embed pills */}
      {orderedCollections.length > 0 && (
        <div className="flex items-center gap-1.5 px-5 pb-4 flex-wrap">
          {orderedCollections.map((c, idx) => (
            <a
              key={c.id}
              href={`/c/${c.id}`}
              draggable={isAdmin}
              onDragStart={isAdmin ? (e) => handleColDragStart(e, idx) : undefined}
              onDragOver={isAdmin ? (e) => handleColDragOver(e, idx) : undefined}
              onDrop={isAdmin ? (e) => handleColDrop(e, idx) : undefined}
              onDragEnd={isAdmin ? handleColDragEnd : undefined}
              className={[
                "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
                "bg-white/[0.04] text-white/70 border-white/10 hover:text-white hover:bg-white/10",
                isAdmin ? "cursor-grab active:cursor-grabbing select-none" : "",
                dragColOver === idx && dragColIdx.current !== idx ? "border-white/50 scale-105" : "",
                dragColIdx.current === idx ? "opacity-40" : "",
              ].join(" ")}
            >
              {c.name}
            </a>
          ))}
        </div>
      )}

      {/* Centered main content */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        {collections.length === 0 ? (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <IframeIcon size={28} />
            </div>
            <h1 className="text-lg font-semibold mb-2">No embeds yet</h1>
            <p className="text-sm text-white/50 mb-6">
              Paste any URL — Notion doc, website, or tool — and get a shareable iframe link for your community.
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                + Add New URL
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            {isAdmin && (
              <p className="text-white/25 text-xs">
                Click a pill to open the iframe · Drag to reorder
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && isAdmin && (
        <AddEmbedModal
          onCreate={handleCreate}
          onClose={() => setShowAddModal(false)}
          onRename={handleRename}
          onDelete={handleDelete}
          collections={orderedCollections}
        />
      )}
    </div>
  );
}

function AddEmbedModal({
  onCreate,
  onClose,
  onRename,
  onDelete,
  collections,
}: {
  onCreate: (name: string, url: string) => Promise<Collection | null>;
  onClose: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  collections: Collection[];
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Collection | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  );

  async function handleSave() {
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onCreate(name.trim(), url.trim());
      if (!result) {
        setError("Failed to create embed. Try again.");
        return;
      }
      setCreated(result);
    } catch {
      setError("Failed to create embed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this URL:", text);
    }
  }

  async function handleRenameSubmit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) { setEditingId(null); return; }
    await onRename(id, trimmed);
    setEditingId(null);
  }

  const shareUrl = created ? `${origin}/c/${created.id}` : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {created ? (
          /* Success state */
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white mb-1">Your embed is ready!</h2>
            <p className="text-sm text-white/50 mb-5">
              Share this link wherever you want the iframe to appear.
            </p>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 mb-4">
              <code className="flex-1 text-xs text-white/70 truncate text-left">{shareUrl}</code>
              <button
                onClick={() => handleCopy(shareUrl)}
                className="flex-shrink-0 px-3 py-1.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">Add New URL</h2>
                <p className="text-xs text-white/40 mt-0.5">Creates a shareable iframe embed link</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 border-b border-white/10 flex-shrink-0">
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Notion Doc, Course Materials"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">URL to embed</label>
                <input
                  type="url"
                  placeholder="https://notion.so/your-page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handleSave}
                disabled={!name.trim() || !url.trim() || saving}
                className="w-full py-2.5 bg-white text-black rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-white/90 transition-colors"
              >
                {saving ? "Saving…" : "Save & Get Link"}
              </button>
            </div>

            {/* Existing embeds list */}
            {collections.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                <p className="text-[11px] font-medium text-white/40 px-5 pt-4 pb-2 uppercase tracking-wide">
                  Existing embeds
                </p>
                {collections.map((c) => {
                  const embedUrl = `${origin}/c/${c.id}`;
                  const isEditing = editingId === c.id;
                  return (
                    <div key={c.id} className="px-5 py-3 border-b border-white/5">
                      {isEditing ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSubmit(c.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            className="flex-1 bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-white/40"
                          />
                          <button onClick={() => handleRenameSubmit(c.id)} className="text-xs text-white/80 hover:text-white px-2">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-white/40 hover:text-white px-2">Cancel</button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-white mb-2">{c.name}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <code className="flex-1 min-w-0 truncate text-xs text-white/40 bg-white/[0.03] px-2 py-1.5 rounded">
                          {embedUrl}
                        </code>
                        <CopyButton url={embedUrl} />
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => { setEditingId(c.id); setEditName(c.name); }}
                            className="text-xs text-white/40 hover:text-white/70 transition-colors"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${c.name}"?`)) onDelete(c.id);
                            }}
                            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this URL:", url);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 px-2.5 py-1.5 bg-white/10 text-white text-xs rounded hover:bg-white/20 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IframeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 10l-3 3 3 3" />
      <path d="M16 10l3 3-3 3" />
      <path d="M12 8v8" />
    </svg>
  );
}
