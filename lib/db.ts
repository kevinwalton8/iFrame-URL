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
  /** IDs of the collections this site belongs to (filter tags). */
  collections?: string[];
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
  url?: string;     // the URL to embed at /c/[id]
  createdAt: string;
};

const SEED_FILE = path.join(process.cwd(), "data", "gallery.json");

type LocalData = {
  sites: Site[];
  categories: Category[];
  collections?: Collection[];
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
  return { sites: [], categories: [], collections: [] };
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

function kvKey(base: string, companyId?: string) {
  return companyId ? `${base}:${companyId}` : base;
}

// ─── Sites ────────────────────────────────────────────────────────────────
export async function getSites(companyId?: string): Promise<Site[]> {
  if (useKV) {
    try { return (await kv.get<Site[]>(kvKey("sites", companyId))) ?? []; }
    catch (err) { console.error("[db] KV getSites error:", err); throw err; }
  }
  return readLocal(companyId).sites;
}

export async function saveSites(sites: Site[], companyId?: string): Promise<void> {
  if (useKV) {
    try { await kv.set(kvKey("sites", companyId), sites); }
    catch (err) { console.error("[db] KV saveSites error:", err); throw err; }
    return;
  }
  const data = readLocal(companyId);
  data.sites = sites;
  writeLocal(data, companyId);
}

export async function updateSite(
  id: string,
  patch: Partial<Omit<Site, "id" | "createdAt">>,
  companyId?: string
): Promise<Site | null> {
  const sites = await getSites(companyId);
  const idx = sites.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sites[idx] = { ...sites[idx], ...patch };
  await saveSites(sites, companyId);
  return sites[idx];
}

// ─── Categories ───────────────────────────────────────────────────────────
export async function getCategories(companyId?: string): Promise<Category[]> {
  if (useKV) {
    try { return (await kv.get<Category[]>(kvKey("categories", companyId))) ?? []; }
    catch (err) { console.error("[db] KV getCategories error:", err); throw err; }
  }
  return readLocal(companyId).categories;
}

export async function saveCategories(categories: Category[], companyId?: string): Promise<void> {
  if (useKV) {
    try { await kv.set(kvKey("categories", companyId), categories); }
    catch (err) { console.error("[db] KV saveCategories error:", err); throw err; }
    return;
  }
  const data = readLocal(companyId);
  data.categories = categories;
  writeLocal(data, companyId);
}

// ─── Collections ──────────────────────────────────────────────────────────
function collectionsKey(companyId?: string) {
  return companyId ? `collections:${companyId}` : "collections";
}

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

/**
 * After deleting a collection, strip its id from every site's `collections` array.
 * Sites themselves are kept (they just lose this filter tag).
 */
export async function scrubCollectionFromSites(companyId: string | undefined, collectionId: string): Promise<void> {
  const sites = await getSites(companyId);
  let touched = false;
  const cleaned = sites.map((s) => {
    if (!s.collections?.includes(collectionId)) return s;
    touched = true;
    return { ...s, collections: s.collections.filter((c) => c !== collectionId) };
  });
  if (touched) await saveSites(cleaned, companyId);
}
