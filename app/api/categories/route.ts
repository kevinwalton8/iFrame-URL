import { NextRequest, NextResponse } from "next/server";
import { getCategories, saveCategories, type Category } from "@/lib/db";
import { hasAccess, authorizedUserOn } from "@whop-apps/sdk";
import { headers } from "next/headers";

const COMPANY_ID = process.env.WHOP_COMPANY_ID ?? "";

async function checkAdmin(_req: NextRequest): Promise<boolean> {
  if (process.env.DEV_ADMIN === "true") return true;
  if (!COMPANY_ID) return false;
  try {
    return await hasAccess({
      to: authorizedUserOn(COMPANY_ID),
      headers: await headers(),
    });
  } catch {
    return false;
  }
}

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { name } = await req.json();
  const categories = await getCategories();
  if (categories.find((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }
  const newCat: Category = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  categories.push(newCat);
  await saveCategories(categories);
  return NextResponse.json(newCat, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id, name } = await req.json();
  const categories = await getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  categories[idx].name = name;
  await saveCategories(categories);
  return NextResponse.json(categories[idx]);
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await req.json();
  const categories = await getCategories();
  const updated = categories.filter((c) => c.id !== id);
  await saveCategories(updated);
  return NextResponse.json({ ok: true });
}
