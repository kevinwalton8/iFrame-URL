"use client";

import { useState, useMemo } from "react";
import type { Site, Category } from "@/lib/db";
import SiteCard from "./SiteCard";
import AddSiteModal from "./AddSiteModal";
import ManageCategoriesModal from "./ManageCategoriesModal";

type Props = {
  initialSites: Site[];
  initialCategories: Category[];
  isAdmin: boolean;
};

export default function Gallery({ initialSites, initialCategories, isAdmin }: Props) {
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "category">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [showManageCategories, setShowManageCategories] = useState(false);

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

  async function handleAddSite(data: Omit<Site, "id" | "createdAt">) {
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setSites((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddCategory(name: string) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const newCat: Category = await res.json();
    setCategories((prev) => [...prev, newCat]);
  }

  async function handleRenameCategory(id: string, name: string) {
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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

  async function handleDeleteCategory(id: string) {
    const res = await fetch("/api/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          {/* App icon placeholder */}
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-xs">
            🔗
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Website Inspiration</h1>
            <p className="text-xs text-white/50">{sites.length} sites</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search icon */}
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Search"
          >
            <SearchIcon />
          </button>

          {/* Filter icon */}
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Filter"
          >
            <FilterIcon />
          </button>

          {/* Settings / Edit toggle for admin */}
          {isAdmin && (
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium transition-colors ${
                editMode
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <SettingsIcon />
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
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

      {/* Edit mode toolbar */}
      {editMode && isAdmin && (
        <div className="flex items-center gap-3 px-5 pb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add Website
          </button>
          <button
            onClick={() => setShowManageCategories(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
          >
            <FolderIcon />
            Manage Categories
          </button>
        </div>
      )}

      {/* View tabs */}
      <div className="flex items-center gap-1 px-5 pb-4">
        <button
          onClick={() => setViewMode("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === "all"
              ? "bg-white text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setViewMode("category")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === "category"
              ? "bg-white text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          By Category
        </button>
      </div>

      {/* Main grid */}
      <div className="px-5 pb-8">
        {viewMode === "all" ? (
          <>
            {filteredSites.length === 0 ? (
              <EmptyState isAdmin={isAdmin} editMode={editMode} onAdd={() => setShowAddModal(true)} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredSites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    editMode={editMode && isAdmin}
                    onDelete={handleDeleteSite}
                    onEdit={setEditingSite}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {sitesByCategory.size === 0 ? (
              <EmptyState isAdmin={isAdmin} editMode={editMode} onAdd={() => setShowAddModal(true)} />
            ) : (
              Array.from(sitesByCategory.entries()).map(([cat, catSites]) => (
                <div key={cat} className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-white">{cat}</h2>
                    <span className="text-xs text-white/40">{catSites.length}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {catSites.map((site) => (
                      <SiteCard
                        key={site.id}
                        site={site}
                        editMode={editMode && isAdmin}
                        onDelete={handleDeleteSite}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Modals */}
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
