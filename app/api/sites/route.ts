import { NextRequest, NextResponse } from "next/server";
import { getSites, saveSites, updateSite, type Site } from "@/lib/db";
import { hasAccess, authorizedUserOn } from "@whop-apps/sdk";
import { headers } from "next/headers";

const FALLBACK_COMPANY_ID = process.env.WHOP_COMPANY_ID ?? "";

/** biz_XXX — used only for admin auth checks */
function getCompanyId(req: NextRequest): string {
  return req.headers.get("x-company-id") || FALLBACK_COMPANY_ID;
}

/** exp_XXX or biz_XXX — the KV storage key for this specific app instance */
function getInstanceId(req: NextRequest): string {
  return req.headers.get("x-instance-id") || getCompanyId(req);
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

export async function GET(req: NextRequest) {
  const instanceId = getInstanceId(req);
  const sites = await getSites(instanceId);
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const instanceId = getInstanceId(req);
  const body = await req.json();
  const sites = await getSites(instanceId);
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
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updated = await updateSite(id, patch, instanceId);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const instanceId = getInstanceId(req);
  const { id } = await req.json();
  const sites = await getSites(instanceId);
  const updated = sites.filter((s) => s.id !== id);
  await saveSites(updated, instanceId);
  return NextResponse.json({ ok: true });
}
