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

// Seed file baked into the deployment — always readable
const SEED_FILE = path.join(process.cwd(), "data", "gallery.json");

type LocalData = {
  sites: Site[];
  categories: Category[];
};

// In dev, read/write the seed file directly.
// On Vercel without KV, use /tmp keyed by companyId so tenants don't mix.
function tmpFile(companyId: string) {
  return `/tmp/gallery-${companyId}.json`;
}

function readLocal(companyId?: string): LocalData {
  const candidates = companyId && process.env.VERCEL
    ? [tmpFile(companyId), SEED_FILE]
    : [SEED_FILE];

  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, "utf-8");
      return JSON.parse(raw);
    } catch {
      // continue
    }
  }
  return { sites: [], categories: [] };
}

function writeLocal(data: LocalData, companyId?: string) {
  const file = companyId && process.env.VERCEL ? tmpFile(companyId) : SEED_FILE;
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const useKV = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

// KV keys are namespaced by companyId so every installer has their own data.
// Falls back to a shared key for local dev (no companyId needed).
function kvKey(base: string, companyId?: string) {
  return companyId ? `${base}:${companyId}` : base;
}

export async function getSites(companyId?: string): Promise<Site[]> {
  if (useKV) {
    return (await kv.get<Site[]>(kvKey("sites", companyId))) ?? [];
  }
  return readLocal(companyId).sites;
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

export async function saveSites(sites: Site[], companyId?: string): Promise<void> {
  if (useKV) {
    await kv.set(kvKey("sites", companyId), sites);
    return;
  }
  const data = readLocal(companyId);
  data.sites = sites;
  writeLocal(data, companyId);
}

export async function getCategories(companyId?: string): Promise<Category[]> {
  if (useKV) {
    return (await kv.get<Category[]>(kvKey("categories", companyId))) ?? [];
  }
  return readLocal(companyId).categories;
}

export async function saveCategories(categories: Category[], companyId?: string): Promise<void> {
  if (useKV) {
    await kv.set(kvKey("categories", companyId), categories);
    return;
  }
  const data = readLocal(companyId);
  data.categories = categories;
  writeLocal(data, companyId);
}
