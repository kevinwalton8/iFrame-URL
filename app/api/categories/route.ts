import { NextRequest, NextResponse } from "next/server";
import { getCategories, saveCategories, type Category } from "@/lib/db";
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
  const categories = await getCategories(instanceId);
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const instanceId = getInstanceId(req);
  const { name } = await req.json();
  const categories = await getCategories(instanceId);
  if (categories.find((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }
  const newCat: Category = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  categories.push(newCat);
  await saveCategories(categories, instanceId);
  return NextResponse.json(newCat, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const instanceId = getInstanceId(req);
  const { id, name } = await req.json();
  const categories = await getCategories(instanceId);
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  categories[idx].name = name;
  await saveCategories(categories, instanceId);
  return NextResponse.json(categories[idx]);
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const instanceId = getInstanceId(req);
  const { id } = await req.json();
  const categories = await getCategories(instanceId);
  const updated = categories.filter((c) => c.id !== id);
  await saveCategories(updated, instanceId);
  return NextResponse.json({ ok: true });
}
