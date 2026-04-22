"use client";

import { useState } from "react";
import type { Site } from "@/lib/db";

type Props = {
  site: Site;
  editMode: boolean;
  onDelete: (id: string) => void;
};

export default function SiteCard({ site, editMode, onDelete }: Props) {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleClick(e: React.MouseEvent) {
    if (editMode) return;
    e.preventDefault();
    window.open(site.url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove "${site.title}"?`)) return;
    setDeleting(true);
    await onDelete(site.id);
  }

  return (
    <div
      onClick={handleClick}
      className={`group relative bg-[#141414] rounded-2xl overflow-hidden border border-white/5 transition-all duration-200 ${
        !editMode ? "cursor-pointer hover:border-white/20 hover:bg-[#1a1a1a] hover:scale-[1.02]" : ""
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

        {/* Hover overlay for non-edit mode */}
        {!editMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full px-3 py-1 flex items-center gap-1.5 text-black text-xs font-medium">
              <ExternalLinkIcon />
              Visit
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white truncate">{site.title}</span>

        {editMode && (
          <button
            onClick={handleDelete}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
            aria-label="Delete site"
          >
            <TrashIcon />
          </button>
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
