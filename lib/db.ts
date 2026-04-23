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

const DATA_FILE = path.join(process.cwd(), "data", "gallery.json");

type LocalData = {
  sites: Site[];
  categories: Category[];
};

function readLocal(): LocalData {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { sites: [], categories: [] };
  }
}

function writeLocal(data: LocalData) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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
