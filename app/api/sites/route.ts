import { NextRequest, NextResponse } from "next/server";
import { getSites, saveSites, updateSite, type Site } from "@/lib/db";
import { hasAccess, authorizedUserOn } from "@whop-apps/sdk";
import { headers } from "next/headers";

const FALLBACK_COMPANY_ID = process.env.WHOP_COMPANY_ID ?? "";

// Use the most-specific ID available:
// x-instance-id = per-app-instance experienceId (preferred — isolates duplicate installs)
// x-company-id  = per-company fallback
function getCompanyId(req: NextRequest): string {
  return (
    req.headers.get("x-instance-id") ||
    req.headers.get("x-company-id") ||
    FALLBACK_COMPANY_ID
  );
}

async function checkAdmin(_req: NextRequest): Promise<boolean> {
  if (process.env.DEV_ADMIN === "true") return true;
  const companyId = getCompanyId(_req);
  if (!companyId) return false;
  try {
    return await hasAccess({
      to: authorizedUserOn(companyId),
      headers: await headers(),
    });
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const companyId = getCompanyId(req);
  const sites = await getSites(companyId);
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const companyId = getCompanyId(req);
  const body = await req.json();
  const sites = await getSites(companyId);
  const newSite: Site = {
    id: crypto.randomUUID(),
    title: body.title,
    url: body.url,
    description: body.description ?? "",
    imageUrl: body.imageUrl ?? "",
    category: body.category ?? "Uncategorized",
    tags: body.tags ?? [],
    createdAt: new Date().toISOString(),
  };
  sites.push(newSite);
  await saveSites(sites, companyId);
  return NextResponse.json(newSite, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const companyId = getCompanyId(req);
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updated = await updateSite(id, patch, companyId);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const companyId = getCompanyId(req);
  const { id } = await req.json();
  const sites = await getSites(companyId);
  const updated = sites.filter((s) => s.id !== id);
  await saveSites(updated, companyId);
  return NextResponse.json({ ok: true });
}
