import { headers } from "next/headers";
import { hasAccess, authorizedUserOn, validateToken } from "@whop-apps/sdk";
import Gallery from "@/components/Gallery";

export default async function Home() {
  const hdrs = await headers();

  // Resolve the company ID from the live Whop session token.
  // Used for admin auth check only — data is fetched client-side
  // with the per-instance experienceId to prevent flashing wrong data.
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

  return <Gallery isAdmin={isAdmin} companyId={companyId} />;
}
