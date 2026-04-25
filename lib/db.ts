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

const SEED_FILE = path.join(process.cwd(), "data", "gallery.json");

type LocalData = {
  sites: Site[];
  categories: Category[];
};

function tmpFile(id: string) {
  return `/tmp/gallery-${id}.json`;
}

function readLocal(id?: string): LocalData {
  const candidates = id && process.env.VERCEL
    ? [tmpFile(id), SEED_FILE]
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

function writeLocal(data: LocalData, id?: string) {
  const file = id && process.env.VERCEL ? tmpFile(id) : SEED_FILE;
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
export const useKV = !!(KV_URL && KV_TOKEN);

if (process.env.VERCEL && !useKV) {
  console.warn(
    "[db] WARNING: Running on Vercel WITHOUT Vercel KV. " +
    "Data is stored in /tmp and will be lost on every redeploy. " +
    "Connect an Upstash KV store in your Vercel project settings."
  );
}

function kvKey(base: string, id?: string) {
  return id ? `${base}:${id}` : base;
}

// --- Sites ---

// instanceId  = the per-experience key (exp_XXX) — isolated per gallery install
// companyId   = the legacy / fallback company key (biz_XXX)
//
// Migration rule: if instanceId has no data but companyId does, copy it over
// once so existing sites appear in the new instance. After the first write,
// instanceId has its own data and no longer falls back.

export async function getSites(instanceId?: string, companyId?: string): Promise<Site[]> {
  if (useKV) {
    try {
      const sites = await kv.get<Site[]>(kvKey("sites", instanceId));
      if (sites && sites.length > 0) return sites;

      // One-time migration: seed from company-level key if available
      if (companyId && companyId !== instanceId) {
        const fallback = await kv.get<Site[]>(kvKey("sites", companyId));
        if (fallback && fallback.length > 0) {
          // Save under instanceId so future reads are fast
          await kv.set(kvKey("sites", instanceId), fallback);
          return fallback;
        }
      }

      return [];
    } catch (err) {
      console.error("[db] KV getSites error:", err);
      throw err;
    }
  }
  return readLocal(instanceId ?? companyId).sites;
}

export async function updateSite(
  id: string,
  patch: Partial<Omit<Site, "id" | "createdAt">>,
  instanceId?: string,
  companyId?: string
): Promise<Site | null> {
  const sites = await getSites(instanceId, companyId);
  const idx = sites.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sites[idx] = { ...sites[idx], ...patch };
  await saveSites(sites, instanceId);
  return sites[idx];
}

export async function saveSites(sites: Site[], instanceId?: string): Promise<void> {
  if (useKV) {
    try {
      await kv.set(kvKey("sites", instanceId), sites);
    } catch (err) {
      console.error("[db] KV saveSites error:", err);
      throw err;
    }
    return;
  }
  const data = readLocal(instanceId);
  data.sites = sites;
  writeLocal(data, instanceId);
}

// --- Categories ---

export async function getCategories(instanceId?: string, companyId?: string): Promise<Category[]> {
  if (useKV) {
    try {
      const cats = await kv.get<Category[]>(kvKey("categories", instanceId));
      if (cats && cats.length > 0) return cats;

      if (companyId && companyId !== instanceId) {
        const fallback = await kv.get<Category[]>(kvKey("categories", companyId));
        if (fallback && fallback.length > 0) {
          await kv.set(kvKey("categories", instanceId), fallback);
          return fallback;
        }
      }

      return [];
    } catch (err) {
      console.error("[db] KV getCategories error:", err);
      throw err;
    }
  }
  return readLocal(instanceId ?? companyId).categories;
}

export async function saveCategories(categories: Category[], instanceId?: string): Promise<void> {
  if (useKV) {
    try {
      await kv.set(kvKey("categories", instanceId), categories);
    } catch (err) {
      console.error("[db] KV saveCategories error:", err);
      throw err;
    }
    return;
  }
  const data = readLocal(instanceId);
  data.categories = categories;
  writeLocal(data, instanceId);
}
