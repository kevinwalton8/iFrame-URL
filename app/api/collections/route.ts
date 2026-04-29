import { NextRequest, NextResponse } from "next/server";
import { getCollections, saveCollections, deleteCollectionData, type Collection } from "@/lib/db";
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
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const collections = await getCollections(companyId);
  const baseSlug = slugify(name);

  // The id "default" is reserved for the legacy/default bucket.
  let id = baseSlug === "default" ? "default-2" : baseSlug;
  let suffix = 1;
  while (collections.find((c) => c.id === id)) {
    suffix++;
    id = `${baseSlug}-${suffix}`;
  }

  const newCollection: Collection = {
    id,
    name: name.trim(),
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
  const { id, name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const collections = await getCollections(companyId);
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  collections[idx].name = name.trim();
  await saveCollections(collections, companyId);
  return NextResponse.json(collections[idx]);
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const companyId = getCompanyId(req);
  const { id } = await req.json();
  if (id === "default") {
    return NextResponse.json({ error: "The Default collection cannot be deleted" }, { status: 400 });
  }
  const collections = await getCollections(companyId);
  const updated = collections.filter((c) => c.id !== id);
  await saveCollections(updated, companyId);
  await deleteCollectionData(companyId, id);
  return NextResponse.json({ ok: true });
}
