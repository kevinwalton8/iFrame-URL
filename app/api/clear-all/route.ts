import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// ONE-TIME USE — delete this file after running.
// Clears all sites and categories from KV. Connection stays intact.

export async function POST() {
  const secret = process.env.CLEAR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLEAR_SECRET env var not set" }, { status: 500 });
  }
  return NextResponse.json({ error: "Use ?secret= param" }, { status: 401 });
}

export async function GET(req: Request) {
  const secret = process.env.CLEAR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLEAR_SECRET env var not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // List and delete every key in the store
  const keys = await kv.keys("*");
  if (keys.length > 0) {
    await Promise.all(keys.map((k) => kv.del(k)));
  }

  return NextResponse.json({ ok: true, deleted: keys });
}
