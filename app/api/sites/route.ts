import { NextRequest, NextResponse } from "next/server";
import { getSites, saveSites, type Site } from "@/lib/db";
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
  const sites = await getSites();
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const sites = await getSites();
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
  await saveSites(sites);
  return NextResponse.json(newSite, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await req.json();
  const sites = await getSites();
  const updated = sites.filter((s) => s.id !== id);
  await saveSites(updated);
  return NextResponse.json({ ok: true });
}
