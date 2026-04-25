"use client";

import { useState } from "react";
import type { Site } from "@/lib/db";

type Props = {
  site: Site;
  editMode: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (site: Site) => void;
};

export default function SiteCard({ site, editMode, selected = false, onSelect, onDelete, onEdit }: Props) {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleCardClick(e: React.MouseEvent) {
    if (editMode) {
      // In edit mode, clicking the card body toggles selection
      onSelect?.(site.id);
      return;
    }
    e.preventDefault();
    window.open(site.url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove "${site.title}"?`)) return;
    setDeleting(true);
    await onDelete(site.id);
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(site);
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative bg-[#141414] rounded-2xl overflow-hidden border transition-all duration-150 ${
        selected
          ? "border-white ring-2 ring-white/60 scale-[0.97]"
          : "border-white/5"
      } ${
        !editMode
          ? "cursor-pointer hover:border-white/20 hover:bg-[#1a1a1a] hover:scale-[1.02]"
          : "cursor-pointer"
      } ${deleting ? "opacity-40 pointer-events-none" : ""}`}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-[4/3] bg-[#1e1e1e] overflow-hidden">
        {site.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.imageUrl}
            alt={site.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <GlobeIcon />
          </div>
        )}

        {/* Non-edit hover overlay */}
        {!editMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full px-3 py-1 flex items-center gap-1.5 text-black text-xs font-medium">
              <ExternalLinkIcon />
              Visit
            </div>
          </div>
        )}

        {/* Selection checkbox — top-left, edit mode only */}
        {editMode && (
          <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
            selected
              ? "bg-white border-white"
              : "bg-black/40 border-white/50 group-hover:border-white"
          }`}>
            {selected && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}

        {/* Selected overlay tint */}
        {editMode && selected && (
          <div className="absolute inset-0 bg-white/10 pointer-events-none" />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white truncate">{site.title}</span>

        {editMode && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={handleEdit}
              className="w-6 h-6 rounded-full bg-white/10 text-white/60 hover:bg-white/25 hover:text-white transition-colors flex items-center justify-center"
              aria-label="Edit site"
            >
              <PencilIcon />
            </button>
            <button
              onClick={handleDelete}
              className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
              aria-label="Delete site"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
