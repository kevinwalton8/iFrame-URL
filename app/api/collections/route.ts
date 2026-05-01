import { NextRequest, NextResponse } from "next/server";
import { getCollections, saveCollections, scrubCollectionFromSites, type Collection } from "@/lib/db";
import { hasAccess, authorizedUserOn } from "@whop-apps/sdk";
import { headers } from "next/headers";

const FALLBACK_COMPANY_ID = process.env.WHOP_COMPANY_ID ?? "";

function getCompanyId(req: NextRequest): string {
  return req.headers.get("x-company-id") || FALLBACK_COMPANY_ID;
}

async function checkAdmin(_req: NextRequest): Promise<boolean> {
  if (process.env.DEV_ADMIN === "true") return true;
  const companyId = getCompanyId(_req);
  if (!companyId) return false;
  try {
    return await hasAccess({ to: authorizedUserOn(companyId), headers: await headers() });
  } catch {
    return false;
  }
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "untitled";
}

export async function GET(req: NextRequest) {
  const companyId = getCompanyId(req);
  const collections = await getCollections(companyId);
  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const companyId = getCompanyId(req);
  const { name, url, code, embedType } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const collections = await getCollections(companyId);
  const baseSlug = slugify(name);

  // Reserve "default" — it's used elsewhere as the no-collection sentinel
  let id = baseSlug === "default" ? "default-2" : baseSlug;
  let suffix = 1;
  while (collections.find((c) => c.id === id)) {
    suffix++;
    id = `${baseSlug}-${suffix}`;
  }

  const newCollection: Collection = {
    id,
    name: name.trim(),
    embedType: embedType ?? (code ? "code" : "url"),
    url: url?.trim() || undefined,
    code: code || undefined,
    createdAt: new Date().toISOString(),
  };
  collections.push(newCollection);
  await saveCollections(collections, companyId);
  return NextResponse.json(newCollection, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const companyId = getCompanyId(req);
  const { id, name, url, code, embedType } = await req.json();
  const collections = await getCollections(companyId);
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (name !== undefined) collections[idx].name = name.trim();
  if (url !== undefined) collections[idx].url = url.trim() || undefined;
  if (code !== undefined) collections[idx].code = code || undefined;
  if (embedType !== undefined) collections[idx].embedType = embedType;
  await saveCollections(collections, companyId);
  return NextResponse.json(collections[idx]);
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const companyId = getCompanyId(req);
  const { id } = await req.json();
  const collections = await getCollections(companyId);
  const updated = collections.filter((c) => c.id !== id);
  await saveCollections(updated, companyId);
  // Clean the deleted ID off any sites that were tagged with it
  await scrubCollectionFromSites(companyId, id);
  return NextResponse.json({ ok: true });
}
