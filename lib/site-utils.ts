import type { Site } from "./db";

/** A site counts as "NEW" if it was added within this many days. */
export const NEW_WINDOW_DAYS = 30;
const NEW_WINDOW_MS = NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isNewSite(site: Site, now: number = Date.now()): boolean {
  const created = new Date(site.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created < NEW_WINDOW_MS;
}

export type SortMode =
  | "newest"     // most recently added at the top (default)
  | "oldest"     // oldest at the top
  | "name-asc"   // A → Z
  | "name-desc"  // Z → A
  | "new-only";  // filter: only sites added in the last 30 days, newest first

export const SORT_MODES: SortMode[] = ["newest", "oldest", "name-asc", "name-desc", "new-only"];

export function isValidSortMode(value: unknown): value is SortMode {
  return typeof value === "string" && (SORT_MODES as string[]).includes(value);
}

/** Apply a sort mode to a list of sites. `new-only` also filters. */
export function sortSites(sites: Site[], mode: SortMode): Site[] {
  const now = Date.now();
  const list = mode === "new-only" ? sites.filter((s) => isNewSite(s, now)) : [...sites];

  switch (mode) {
    case "newest":
    case "new-only":
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "oldest":
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case "name-asc":
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "name-desc":
      list.sort((a, b) => b.title.localeCompare(a.title));
      break;
  }
  return list;
}
