"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Site, Category } from "@/lib/db";
import SiteCard from "./SiteCard";
import AddSiteModal from "./AddSiteModal";
import QuickAddModal from "./QuickAddModal";
import ManageCategoriesModal from "./ManageCategoriesModal";
import GridPicker from "./GridPicker";
import BulkActionBar from "./BulkActionBar";

type Props = {
  isAdmin: boolean;
  companyId: string;
};

export default function Gallery({ isAdmin, companyId }: Props) {
  // Always start empty — the client fetches with the correct experienceId.
  // This prevents a flash of server-rendered data from the wrong instance key.
  const [sites, setSites] = useState<Site[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "category">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [gridCols, setGridCols] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gallery-grid-cols");
      if (saved) return Number(saved);
    }
    return 4;
  });

  // instanceId is what we use as the KV namespace key.
  // Starts as companyId (server-side fallback), then upgrades to
  // the real Whop experienceId (unique per app instance) once the
  // iframe SDK resolves it client-side.
  const [instanceId, setInstanceId] = useState<string>(companyId);
  const instanceResolved = useRef(false);

  useEffect(() => {
    if (instanceResolved.current) return;
    instanceResolved.current = true;

    async function resolveInstance() {
      let expId = companyId; // fallback

      // Try to get the per-instance experienceId from the Whop iframe SDK.
      // Race against a 2.5s timeout so a non-responsive parent never blocks loading.
      if (typeof window !== "undefined" && window.parent !== window) {
        try {
          const { createAppIframeSDK } = await import("@whop-apps/sdk");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sdk = createAppIframeSDK({ onMessage: {} as any });
          const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
          const urlData = await Promise.race([sdk.getTopLevelUrlData({}), timeout]);
          if (urlData?.experienceId) expId = urlData.experienceId;
        } catch {
          // SDK unavailable — stay on companyId
        }
      }

      setInstanceId(expId);

      // Always fetch client-side so we never show the wrong instance's data
      try {
        const [sitesRes, catsRes] = await Promise.all([
          fetch("/api/sites", { headers: { "x-instance-id": expId, "x-company-id": companyId } }),
          fetch("/api/categories", { headers: { "x-instance-id": expId, "x-company-id": companyId } }),
        ]);
        if (sitesRes.ok) setSites(await sitesRes.json());
        if (catsRes.ok) setCategories(await catsRes.json());
      } catch {
        // Network error — leave empty
      } finally {
        setLoading(false);
      }
    }

    resolveInstance();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGridChange(cols: number) {
    setGridCols(cols);
    if (typeof window !== "undefined") localStorage.setItem("gallery-grid-cols", String(cols));
  }

  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [showManageCategories, setShowManageCategories] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredSites.map((s) => s.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Clear selection when leaving edit mode
  function handleSetEditMode(val: boolean) {
    setEditMode(val);
    if (!val) clearSelection();
  }

  // Helper: headers for every API call — always includes both IDs so the
  // server can use the most-specific one available.
  function apiHeaders() {
    return {
      "Content-Type": "application/json",
      "x-instance-id": instanceId,
      "x-company-id": companyId,
    };
  }

  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites;
    const q = searchQuery.toLowerCase();
    return sites.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    );
  }, [sites, searchQuery]);

  const sitesByCategory = useMemo(() => {
    const map = new Map<string, Site[]>();
    filteredSites.forEach((site) => {
      const cat = site.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(site);
    });
    return map;
  }, [filteredSites]);

  const activeCategoryNames = useMemo(() => Array.from(sitesByCategory.keys()), [sitesByCategory]);

  async function handleAddSite(data: Omit<Site, "id" | "createdAt">) {
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const newSite: Site = await res.json();
    setSites((prev) => [...prev, newSite]);
    setShowAddModal(false);
  }

  async function handleUpdateSite(id: string, data: Omit<Site, "id" | "createdAt">) {
    const res = await fetch("/api/sites", {
      method: "PUT",
      headers: apiHeaders(),
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) return;
    const updated: Site = await res.json();
    setSites((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditingSite(null);
  }

  async function handleDeleteSite(id: string) {
    const res = await fetch("/api/sites", {
      method: "DELETE",
      headers: apiHeaders(),
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setSites((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddCategory(name: string) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const newCat: Category = await res.json();
    setCategories((prev) => [...prev, newCat]);
  }

  async function handleRenameCategory(id: string, name: string) {
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: apiHeaders(),
      body: JSON.stringify({ id, name }),
    });
    if (!res.ok) return;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setSites((prev) =>
      prev.map((s) => {
        const oldCat = categories.find((c) => c.id === id);
        return oldCat && s.category === oldCat.name ? { ...s, category: name } : s;
      })
    );
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} site${selectedIds.size > 1 ? "s" : ""}?`)) return;
    for (const id of selectedIds) {
      await fetch("/api/sites", {
        method: "DELETE",
        headers: apiHeaders(),
        body: JSON.stringify({ id }),
      });
    }
    setSites((prev) => prev.filter((s) => !selectedIds.has(s.id)));
    clearSelection();
  }

  async function handleBulkAssignCategory(categoryName: string) {
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        fetch("/api/sites", {
          method: "PUT",
          headers: apiHeaders(),
          body: JSON.stringify({ id, category: categoryName }),
        })
      )
    );
    setSites((prev) =>
      prev.map((s) => (selectedIds.has(s.id) ? { ...s, category: categoryName } : s))
    );
    clearSelection();
  }

  async function handleBulkAddTag(tag: string) {
    const ids = Array.from(selectedIds);
    const updates = sites.filter((s) => selectedIds.has(s.id)).map((s) => ({
      id: s.id,
      tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag],
    }));
    await Promise.all(
      updates.map(({ id, tags }) =>
        fetch("/api/sites", {
          method: "PUT",
          headers: apiHeaders(),
          body: JSON.stringify({ id, tags }),
        })
      )
    );
    setSites((prev) =>
      prev.map((s) => {
        const u = updates.find((u) => u.id === s.id);
        return u ? { ...s, tags: u.tags } : s;
      })
    );
    clearSelection();
  }

  async function handleDeleteCategory(id: string) {
    const res = await fetch("/api/categories", {
      method: "DELETE",
      headers: apiHeaders(),
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  const gridClass = `grid grid-cols-2 sm:grid-cols-3 ${{
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
    7: "lg:grid-cols-7",
    8: "lg:grid-cols-8",
  }[gridCols] ?? "lg:grid-cols-4"} gap-4`;

  const categoryEntries = useMemo(() => {
    if (selectedCategory) {
      const sites = sitesByCategory.get(selectedCategory);
      return sites ? [[selectedCategory, sites] as [string, Site[]]] : [];
    }
    return Array.from(sitesByCategory.entries());
  }, [sitesByCategory, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-xs">
            🔗
          </div>
          <span className="text-sm font-medium text-white/70">
            {sites.length} {sites.length === 1 ? "site" : "sites"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Search"
          >
            <SearchIcon />
          </button>

          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Filter"
          >
            <FilterIcon />
          </button>

          {/* Grid picker — desktop only, hidden on all mobile viewports */}
          <div className="hidden lg:block">
            <GridPicker value={gridCols} onChange={handleGridChange} />
          </div>

          {isAdmin && (
            <button
              onClick={() => handleSetEditMode(!editMode)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium transition-colors ${
                editMode
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <SettingsIcon />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="px-5 pb-3">
          <input
            type="text"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
            autoFocus
          />
        </div>
      )}

      {editMode && isAdmin && (
        /* Scrollable single row on mobile — no wrapping, compact pill buttons */
        <div className="flex items-center gap-2 px-5 pb-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white text-black rounded-xl text-xs font-semibold hover:bg-white/90 transition-colors"
          >
            <BoltIcon />
            Quick Add
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <span className="text-sm leading-none font-medium">+</span>
            Add
          </button>
          <button
            onClick={() => setShowManageCategories(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <FolderIcon />
            Categories
          </button>
        </div>
      )}

      {/* View tabs + inline category filter pills */}
      <div className="flex items-center gap-1.5 px-5 pb-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setViewMode("all"); setSelectedCategory(null); }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === "all" ? "bg-white text-black" : "text-white/60 hover:text-white"
          }`}
        >
          All
        </button>

        <button
          onClick={() => { setViewMode("category"); setSelectedCategory(null); }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === "category" ? "bg-white text-black" : "text-white/60 hover:text-white"
          }`}
        >
          By Category
        </button>

        {viewMode === "category" && activeCategoryNames.length > 0 && (
          <>
            <div className="flex-shrink-0 w-px h-4 bg-white/15 mx-0.5" />
            {activeCategoryNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedCategory((prev) => (prev === name ? null : name))}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === name
                    ? "bg-white/20 text-white ring-1 ring-white/30"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                {name}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Main grid */}
      <div className="px-5 pb-8">
        {loading ? (
          /* Skeleton cards while instanceId resolves — prevents flash of wrong data */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 animate-pulse">
                <div className="w-full aspect-[4/3] bg-white/5" />
                <div className="px-3 py-2.5">
                  <div className="h-3.5 bg-white/10 rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "all" ? (
          filteredSites.length === 0 ? (
            <EmptyState isAdmin={isAdmin} editMode={editMode} onAdd={() => setShowAddModal(true)} />
          ) : (
            <div className={gridClass}>
              {filteredSites.map((site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  editMode={editMode && isAdmin}
                  selected={selectedIds.has(site.id)}
                  onSelect={toggleSelect}
                  onDelete={handleDeleteSite}
                  onEdit={setEditingSite}
                />
              ))}
            </div>
          )
        ) : (
          categoryEntries.length === 0 ? (
            <EmptyState isAdmin={isAdmin} editMode={editMode} onAdd={() => setShowAddModal(true)} />
          ) : (
            categoryEntries.map(([cat, catSites]) => (
              <div key={cat} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-white">{cat}</h2>
                  <span className="text-xs text-white/40">{catSites.length}</span>
                </div>
                <div className={gridClass}>
                  {catSites.map((site) => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      editMode={editMode && isAdmin}
                      selected={selectedIds.has(site.id)}
                      onSelect={toggleSelect}
                      onDelete={handleDeleteSite}
                      onEdit={setEditingSite}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Bulk action bar — floats above bottom when cards are selected */}
      {editMode && isAdmin && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          total={filteredSites.length}
          categories={categories}
          onSelectAll={selectAll}
          onClear={clearSelection}
          onDelete={handleBulkDelete}
          onAssignCategory={handleBulkAssignCategory}
          onAddTag={handleBulkAddTag}
        />
      )}

      {/* Modals */}
      {showQuickAdd && (
        <QuickAddModal
          categories={categories}
          companyId={companyId}
          defaultCategory={
            viewMode === "category" && selectedCategory ? selectedCategory : undefined
          }
          onAdd={async (data) => {
            const res = await fetch("/api/sites", {
              method: "POST",
              headers: apiHeaders(),
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save");
            const newSite: Site = await res.json();
            setSites((prev) => [...prev, newSite]);
            setShowQuickAdd(false);
          }}
          onClose={() => setShowQuickAdd(false)}
          onCreateCategory={handleAddCategory}
        />
      )}

      {showAddModal && (
        <AddSiteModal
          categories={categories}
          onAdd={handleAddSite}
          onClose={() => setShowAddModal(false)}
          onCreateCategory={handleAddCategory}
        />
      )}

      {editingSite && (
        <AddSiteModal
          categories={categories}
          initialSite={editingSite}
          onUpdate={handleUpdateSite}
          onClose={() => setEditingSite(null)}
          onCreateCategory={handleAddCategory}
        />
      )}

      {showManageCategories && (
        <ManageCategoriesModal
          categories={categories}
          onAdd={handleAddCategory}
          onRename={handleRenameCategory}
          onDelete={handleDeleteCategory}
          onClose={() => setShowManageCategories(false)}
        />
      )}
    </div>
  );
}

function EmptyState({
  isAdmin,
  editMode,
  onAdd,
}: {
  isAdmin: boolean;
  editMode: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-4">
        🔗
      </div>
      <p className="text-white/50 text-sm">No sites yet.</p>
      {isAdmin && !editMode && (
        <p className="text-white/30 text-xs mt-1">Enable Settings to add sites.</p>
      )}
      {isAdmin && editMode && (
        <button
          onClick={onAdd}
          className="mt-4 px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-colors"
        >
          + Add Website
        </button>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
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
function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
