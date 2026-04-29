"use client";

import { useState, useRef, useEffect } from "react";
import type { SortMode } from "@/lib/site-utils";

type Props = {
  value: SortMode;
  onChange: (mode: SortMode) => void;
};

const OPTIONS: { mode: SortMode; label: string; sub?: string }[] = [
  { mode: "newest", label: "Newest first" },
  { mode: "oldest", label: "Oldest first" },
  { mode: "name-asc", label: "Name (A → Z)" },
  { mode: "name-desc", label: "Name (Z → A)" },
  { mode: "new-only", label: "NEW only", sub: "Last 30 days" },
];

export default function SortMenu({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const isActive = value !== "newest"; // visual hint when sorting away from default

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          open || isActive
            ? "bg-white/15 text-white"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        aria-label="Sort"
      >
        <SortIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-[#1e1e1e] border border-white/10 rounded-xl p-1 shadow-2xl min-w-[200px]">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-3 pt-2 pb-1">
            Sort
          </p>
          {OPTIONS.map((o) => {
            const selected = value === o.mode;
            return (
              <button
                key={o.mode}
                onClick={() => { onChange(o.mode); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between gap-2 ${
                  selected
                    ? "bg-white text-black font-medium"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="flex flex-col">
                  <span className="flex items-center gap-1.5">
                    {o.mode === "new-only" && (
                      <span className={`text-[9px] font-extrabold tracking-tight px-1 py-px rounded-full ${
                        selected ? "bg-black text-white" : "text-white"
                      }`} style={!selected ? {backgroundColor: '#0019FF'} : {}}>
                        NEW
                      </span>
                    )}
                    {o.label}
                  </span>
                  {o.sub && (
                    <span className={`text-[10px] ${selected ? "text-black/60" : "text-white/40"}`}>
                      {o.sub}
                    </span>
                  )}
                </span>
                {selected && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16l4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
