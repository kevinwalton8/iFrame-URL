import { headers } from "next/headers";
import { hasAccess, authorizedUserOn, validateToken } from "@whop-apps/sdk";
import { getCollections } from "@/lib/db";
import EmbedManager from "@/components/Gallery";

export default async function Home() {
  const hdrs = await headers();

  let companyId = process.env.WHOP_COMPANY_ID ?? "";
  try {
    const tokenData = await validateToken({ headers: hdrs, dontThrow: true });
    if (tokenData?.appId) {
      const parts = tokenData.appId.split(":");
      const bizPart = parts.find((p) => p.startsWith("biz_"));
      if (bizPart) companyId = bizPart;
    }
  } catch {
    // use env fallback
  }

  let isAdmin = process.env.DEV_ADMIN === "true";
  if (!isAdmin && companyId) {
    try {
      isAdmin = await hasAccess({ to: authorizedUserOn(companyId), headers: hdrs });
    } catch {
      isAdmin = false;
    }
  }

  const collections = await getCollections(companyId);

  return (
    <EmbedManager
      initialCollections={collections}
      isAdmin={isAdmin}
      companyId={companyId}
    />
  );
}
