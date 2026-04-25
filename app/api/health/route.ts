import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

export async function GET() {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const useKV = !!(kvUrl && kvToken);

  const info: Record<string, unknown> = {
    storage: useKV ? "kv" : "tmp/local",
    kv_url_present: !!kvUrl,
    kv_token_present: !!kvToken,
    vercel: !!process.env.VERCEL,
    node_env: process.env.NODE_ENV,
    whop_company_id: process.env.WHOP_COMPANY_ID ?? "(not set)",
  };

  if (useKV) {
    try {
      // Write a probe key and read it back to confirm KV is live
      await kv.set("__health_probe__", Date.now(), { ex: 60 });
      const probe = await kv.get("__health_probe__");
      info.kv_ping = probe ? "ok" : "write succeeded but read returned null";
    } catch (err) {
      info.kv_ping = `error: ${err instanceof Error ? err.message : String(err)}`;
    }

    try {
      // List all keys so we can see what's stored
      const keys = await kv.keys("*");
      info.kv_keys = keys;
    } catch (err) {
      info.kv_keys = `error listing keys: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json(info, { status: 200 });
}
