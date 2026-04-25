import { NextRequest, NextResponse } from "next/server";
import { getSites, saveSites, updateSite, type Site } from "@/lib/db";
import { hasAccess, authorizedUserOn } from "@whop-apps/sdk";
import { headers } from "next/headers";

const FALLBACK_COMPANY_ID = process.env.WHOP_COMPANY_ID ?? "";

// Storage key: prefer the per-instance experienceId so duplicate installs
// each get their own isolated data.
function getInstanceId(req: NextRequest): string {
  return (
    req.headers.get("x-instance-id") ||
    req.headers.get("x-company-id") ||
    FALLBACK_COMPANY_ID
  );
}

// Auth ALWAYS uses the company ID — never the experienceId.
// authorizedUserOn() requires a biz_XXX value, not exp_XXX.
function getCompanyIdForAuth(req: NextRequest): string {
  return req.headers.get("x-company-id") || FALLBACK_COMPANY_ID;
}

async function checkAdmin(_req: NextRequest): Promise<boolean> {
  if (process.env.DEV_ADMIN === "true") return true;
  const companyId = getCompanyIdForAuth(_req);
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
  const instanceId = getInstanceId(req);
  const companyId = getCompanyIdForAuth(req);
  // Pass companyId as migration fallback: if instanceId has no data yet,
  // db will seed it from the company-level key (one-time migration).
  const sites = await getSites(instanceId, companyId);
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const instanceId = getInstanceId(req);
  const companyId = getCompanyIdForAuth(req);
  const body = await req.json();
  const sites = await getSites(instanceId, companyId);
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
  await saveSites(sites, instanceId);
  return NextResponse.json(newSite, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const instanceId = getInstanceId(req);
  const companyId = getCompanyIdForAuth(req);
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updated = await updateSite(id, patch, instanceId, companyId);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const instanceId = getInstanceId(req);
  const companyId = getCompanyIdForAuth(req);
  const { id } = await req.json();
  const sites = await getSites(instanceId, companyId);
  const updated = sites.filter((s) => s.id !== id);
  await saveSites(updated, instanceId);
  return NextResponse.json({ ok: true });
}
