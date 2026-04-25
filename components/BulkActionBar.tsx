"use client";

import { useState, useRef, useEffect } from "react";
import type { Category } from "@/lib/db";

type Props = {
  count: number;
  total: number;
  categories: Category[];
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  onAssignCategory: (categoryName: string) => void;
  onAddTag: (tag: string) => void;
};

export default function BulkActionBar({
  count,
  total,
  categories,
  onSelectAll,
  onClear,
  onDelete,
  onAssignCategory,
  onAddTag,
}: Props) {
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState("");
  const catRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);

  // Close category menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setShowCatMenu(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Focus tag input when it opens
  useEffect(() => {
    if (showTagInput) tagRef.current?.focus();
  }, [showTagInput]);

  function handleTagSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tagValue.trim();
    if (!trimmed) return;
    onAddTag(trimmed);
    setTagValue("");
    setShowTagInput(false);
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-lg">
      <div className="bg-[#1c1c1c] border border-white/15 rounded-2xl shadow-2xl shadow-black/60 p-3 flex flex-col gap-2">

        {/* Top row: count + select all / clear */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-white">
            {count} selected
          </span>
          <div className="flex items-center gap-3">
            {count < total && (
              <button
                onClick={onSelectAll}
                className="text-xs text-white/50 hover:text-white transition-colors"
              >
                Select all {total}
              </button>
            )}
            <button
              onClick={onClear}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">

          {/* Delete */}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          >
            <TrashIcon />
            Delete
          </button>

          {/* Assign category */}
          <div ref={catRef} className="relative">
            <button
              onClick={() => { setShowCatMenu((v) => !v); setShowTagInput(false); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
                showCatMenu
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <FolderIcon />
              Category
              <ChevronIcon up={showCatMenu} />
            </button>

            {showCatMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#1e1e1e] border border-white/10 rounded-xl p-1.5 shadow-2xl min-w-[160px] max-h-48 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-xs text-white/30 px-3 py-2">No categories yet</p>
                ) : (
                  categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { onAssignCategory(cat.name); setShowCatMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {cat.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Add tag */}
          {showTagInput ? (
            <form onSubmit={handleTagSubmit} className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                ref={tagRef}
                type="text"
                placeholder="Tag name…"
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setShowTagInput(false)}
                className="flex-1 min-w-0 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-colors flex-shrink-0"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setShowTagInput(false)}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0"
              >
                <XIcon />
              </button>
            </form>
          ) : (
            <button
              onClick={() => { setShowTagInput(true); setShowCatMenu(false); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 text-white hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
            >
              <TagIcon />
              Tag
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      className={`transition-transform ${up ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
