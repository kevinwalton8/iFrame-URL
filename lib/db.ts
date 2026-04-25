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

// Seed file baked into the deployment — always readable, never written to on Vercel
const SEED_FILE = path.join(process.cwd(), "data", "gallery.json");

type LocalData = {
  sites: Site[];
  categories: Category[];
};

// /tmp is keyed by companyId so tenants don't share data.
// NOTE: /tmp is ephemeral on Vercel — it is ONLY used as a last resort
// when KV is unavailable. Any data written here WILL be lost on redeploy.
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

// Evaluated at module load — if KV env vars are present we always use KV.
// On Vercel, if these vars are missing it means KV wasn't connected: data
// will land in ephemeral /tmp and disappear on the next redeploy.
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
export const useKV = !!(KV_URL && KV_TOKEN);

// Warn loudly in server logs when running on Vercel without KV
if (process.env.VERCEL && !useKV) {
  console.warn(
    "[db] WARNING: Running on Vercel WITHOUT Vercel KV. " +
    "Data is stored in /tmp and will be lost on every redeploy. " +
    "Connect an Upstash KV store in your Vercel project settings."
  );
}

// KV keys are namespaced by companyId so every installer has their own data.
function kvKey(base: string, companyId?: string) {
  return companyId ? `${base}:${companyId}` : base;
}

export async function getSites(companyId?: string): Promise<Site[]> {
  if (useKV) {
    try {
      return (await kv.get<Site[]>(kvKey("sites", companyId))) ?? [];
    } catch (err) {
      console.error("[db] KV getSites error:", err);
      // Don't fall back to /tmp — surface the error so it's visible
      throw err;
    }
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
    try {
      await kv.set(kvKey("sites", companyId), sites);
    } catch (err) {
      console.error("[db] KV saveSites error:", err);
      throw err;
    }
    return;
  }
  const data = readLocal(companyId);
  data.sites = sites;
  writeLocal(data, companyId);
}

export async function getCategories(companyId?: string): Promise<Category[]> {
  if (useKV) {
    try {
      return (await kv.get<Category[]>(kvKey("categories", companyId))) ?? [];
    } catch (err) {
      console.error("[db] KV getCategories error:", err);
      throw err;
    }
  }
  return readLocal(companyId).categories;
}

export async function saveCategories(categories: Category[], companyId?: string): Promise<void> {
  if (useKV) {
    try {
      await kv.set(kvKey("categories", companyId), categories);
    } catch (err) {
      console.error("[db] KV saveCategories error:", err);
      throw err;
    }
    return;
  }
  const data = readLocal(companyId);
  data.categories = categories;
  writeLocal(data, companyId);
}
