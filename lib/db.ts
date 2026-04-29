import { kv } from "@vercel/kv";
import fs from "fs";
import path from "path";

export type Site = {
  id: string;
  title: string;
  url: string;
  description?: string;
  imageUrl: string;
  category: string;
  tags: string[];
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  createdAt: string;
};

export type Collection = {
  id: string;        // url-safe slug
  name: string;     // human-readable name
  createdAt: string;
};

export const DEFAULT_COLLECTION_ID = "default";

const SEED_FILE = path.join(process.cwd(), "data", "gallery.json");

type LocalData = {
  sites: Site[];
  categories: Category[];
  collections?: Collection[];
  sitesByCollection?: Record<string, Site[]>;
  categoriesByCollection?: Record<string, Category[]>;
};

function tmpFile(companyId: string) {
  return `/tmp/gallery-${companyId}.json`;
}

function readLocal(companyId?: string): LocalData {
  const candidates = companyId && process.env.VERCEL
    ? [tmpFile(companyId), SEED_FILE]
    : [SEED_FILE];
  for (const file of candidates) {
    try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { /* next */ }
  }
  return { sites: [], categories: [], collections: [], sitesByCollection: {}, categoriesByCollection: {} };
}

function writeLocal(data: LocalData, companyId?: string) {
  const file = companyId && process.env.VERCEL ? tmpFile(companyId) : SEED_FILE;
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
export const useKV = !!(KV_URL && KV_TOKEN);

if (process.env.VERCEL && !useKV) {
  console.warn("[db] WARNING: Running on Vercel WITHOUT KV. Data stored in /tmp will be lost on redeploy.");
}

function isDefault(collectionId?: string) {
  return !collectionId || collectionId === DEFAULT_COLLECTION_ID;
}

/**
 * Storage key for a collection's sites/categories.
 * - default collection: legacy key (e.g. `sites:biz_XXX`) — keeps existing data intact
 * - other collections: suffixed key (e.g. `sites:biz_XXX:mockups`)
 */
function scopedKey(base: string, companyId?: string, collectionId?: string) {
  const namespaced = companyId ? `${base}:${companyId}` : base;
  return isDefault(collectionId) ? namespaced : `${namespaced}:${collectionId}`;
}

function collectionsKey(companyId?: string) {
  return companyId ? `collections:${companyId}` : "collections";
}

// ─── Sites ────────────────────────────────────────────────────────────────
export async function getSites(companyId?: string, collectionId?: string): Promise<Site[]> {
  if (useKV) {
    try { return (await kv.get<Site[]>(scopedKey("sites", companyId, collectionId))) ?? []; }
    catch (err) { console.error("[db] KV getSites error:", err); throw err; }
  }
  const data = readLocal(companyId);
  if (isDefault(collectionId)) return data.sites;
  return data.sitesByCollection?.[collectionId!] ?? [];
}

export async function saveSites(sites: Site[], companyId?: string, collectionId?: string): Promise<void> {
  if (useKV) {
    try { await kv.set(scopedKey("sites", companyId, collectionId), sites); }
    catch (err) { console.error("[db] KV saveSites error:", err); throw err; }
    return;
  }
  const data = readLocal(companyId);
  if (isDefault(collectionId)) {
    data.sites = sites;
  } else {
    data.sitesByCollection = data.sitesByCollection ?? {};
    data.sitesByCollection[collectionId!] = sites;
  }
  writeLocal(data, companyId);
}

export async function updateSite(
  id: string,
  patch: Partial<Omit<Site, "id" | "createdAt">>,
  companyId?: string,
  collectionId?: string
): Promise<Site | null> {
  const sites = await getSites(companyId, collectionId);
  const idx = sites.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sites[idx] = { ...sites[idx], ...patch };
  await saveSites(sites, companyId, collectionId);
  return sites[idx];
}

// ─── Categories ───────────────────────────────────────────────────────────
export async function getCategories(companyId?: string, collectionId?: string): Promise<Category[]> {
  if (useKV) {
    try { return (await kv.get<Category[]>(scopedKey("categories", companyId, collectionId))) ?? []; }
    catch (err) { console.error("[db] KV getCategories error:", err); throw err; }
  }
  const data = readLocal(companyId);
  if (isDefault(collectionId)) return data.categories;
  return data.categoriesByCollection?.[collectionId!] ?? [];
}

export async function saveCategories(categories: Category[], companyId?: string, collectionId?: string): Promise<void> {
  if (useKV) {
    try { await kv.set(scopedKey("categories", companyId, collectionId), categories); }
    catch (err) { console.error("[db] KV saveCategories error:", err); throw err; }
    return;
  }
  const data = readLocal(companyId);
  if (isDefault(collectionId)) {
    data.categories = categories;
  } else {
    data.categoriesByCollection = data.categoriesByCollection ?? {};
    data.categoriesByCollection[collectionId!] = categories;
  }
  writeLocal(data, companyId);
}

// ─── Collections ──────────────────────────────────────────────────────────
export async function getCollections(companyId?: string): Promise<Collection[]> {
  if (useKV) {
    try { return (await kv.get<Collection[]>(collectionsKey(companyId))) ?? []; }
    catch (err) { console.error("[db] KV getCollections error:", err); throw err; }
  }
  return readLocal(companyId).collections ?? [];
}

export async function saveCollections(collections: Collection[], companyId?: string): Promise<void> {
  if (useKV) {
    try { await kv.set(collectionsKey(companyId), collections); }
    catch (err) { console.error("[db] KV saveCollections error:", err); throw err; }
    return;
  }
  const data = readLocal(companyId);
  data.collections = collections;
  writeLocal(data, companyId);
}

/** Wipe sites + categories for a non-default collection. */
export async function deleteCollectionData(companyId?: string, collectionId?: string): Promise<void> {
  if (isDefault(collectionId)) return; // never wipe the default bucket
  if (useKV) {
    try {
      await kv.del(scopedKey("sites", companyId, collectionId));
      await kv.del(scopedKey("categories", companyId, collectionId));
    } catch (err) { console.error("[db] KV deleteCollectionData error:", err); throw err; }
    return;
  }
  const data = readLocal(companyId);
  if (data.sitesByCollection) delete data.sitesByCollection[collectionId!];
  if (data.categoriesByCollection) delete data.categoriesByCollection[collectionId!];
  writeLocal(data, companyId);
}
