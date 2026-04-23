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
// /tmp is writable on Vercel serverless; falls back to project dir in dev
const WRITE_FILE = process.env.VERCEL
  ? "/tmp/gallery.json"
  : SEED_FILE;

type LocalData = {
  sites: Site[];
  categories: Category[];
};

function readLocal(): LocalData {
  // Try the writable copy first (has any in-session edits), then fall back to seed
  for (const file of [WRITE_FILE, SEED_FILE]) {
    try {
      const raw = fs.readFileSync(file, "utf-8");
      return JSON.parse(raw);
    } catch {
      // continue
    }
  }
  return { sites: [], categories: [] };
}

function writeLocal(data: LocalData) {
  const dir = path.dirname(WRITE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WRITE_FILE, JSON.stringify(data, null, 2));
}

const useKV = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

export async function getSites(): Promise<Site[]> {
  if (useKV) {
    return (await kv.get<Site[]>("sites")) ?? [];
  }
  return readLocal().sites;
}

export async function updateSite(id: string, patch: Partial<Omit<Site, "id" | "createdAt">>): Promise<Site | null> {
  const sites = await getSites();
  const idx = sites.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sites[idx] = { ...sites[idx], ...patch };
  await saveSites(sites);
  return sites[idx];
}

export async function saveSites(sites: Site[]): Promise<void> {
  if (useKV) {
    await kv.set("sites", sites);
    return;
  }
  const data = readLocal();
  data.sites = sites;
  writeLocal(data);
}

export async function getCategories(): Promise<Category[]> {
  if (useKV) {
    return (await kv.get<Category[]>("categories")) ?? [];
  }
  return readLocal().categories;
}

export async function saveCategories(categories: Category[]): Promise<void> {
  if (useKV) {
    await kv.set("categories", categories);
    return;
  }
  const data = readLocal();
  data.categories = categories;
  writeLocal(data);
}
