"use client";

import { useState } from "react";
import type { Category } from "@/lib/db";

type Props = {
  categories: Category[];
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
};

export default function ManageCategoriesModal({ categories, onAdd, onRename, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    await onAdd(newName.trim());
    setNewName("");
    setAdding(false);
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) { setEditingId(null); return; }
    await onRename(id, editingName.trim());
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold">Manage Categories</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Existing categories */}
        <div className="px-6 max-h-72 overflow-y-auto space-y-2">
          {categories.length === 0 && (
            <p className="text-white/40 text-sm py-4 text-center">No categories yet.</p>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              {editingId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => handleRename(cat.id)}
                    className="px-2.5 py-1.5 bg-white text-black rounded-lg text-xs font-medium hover:bg-white/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{cat.name}</span>
                  <button
                    onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    aria-label="Rename"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete category "${cat.name}"?`)) onDelete(cat.id);
                    }}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                    aria-label="Delete"
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        <form onSubmit={handleAdd} className="px-6 pb-6 pt-4 border-t border-white/10 mt-4 flex gap-2">
          <input
            type="text"
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-4 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-white/90 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
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

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
