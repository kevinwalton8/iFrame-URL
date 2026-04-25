"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: number;
  onChange: (cols: number) => void;
};

const OPTIONS = [3, 4, 5, 6, 7, 8];

export default function GridPicker({ value, onChange }: Props) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          open ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        aria-label="Grid density"
        title="Grid density"
      >
        <GridIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 bg-[#1e1e1e] border border-white/10 rounded-2xl p-3 shadow-2xl">
          {/* Header */}
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5 px-0.5">
            Grid Size
          </p>

          {/* Options */}
          <div className="flex gap-2">
            {OPTIONS.map((cols) => (
              <button
                key={cols}
                onClick={() => { onChange(cols); setOpen(false); }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors ${
                  value === cols
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
                title={`${cols} columns`}
              >
                <MiniGrid cols={cols} active={value === cols} />
                <span className="text-[10px] font-semibold leading-none">{cols}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniGrid({ cols, active }: { cols: number; active: boolean }) {
  // Show 2 rows of `cols` columns of tiny boxes
  // Wider boxes for fewer cols, narrower for more
  const boxW = Math.max(3, Math.min(8, Math.floor(48 / cols) - 2));

  return (
    <div className="flex flex-col gap-[3px]">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-[3px]">
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className={`h-[5px] rounded-[2px] transition-colors ${
                active ? "bg-black/40" : "bg-current opacity-60"
              }`}
              style={{ width: boxW }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
