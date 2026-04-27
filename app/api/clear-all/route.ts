import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// ONE-TIME USE — delete this file after running.
export async function GET() {
  const keys = await kv.keys("*");
  if (keys.length > 0) {
    await Promise.all(keys.map((k) => kv.del(k)));
  }
  return NextResponse.json({ ok: true, deleted: keys });
}
