import { headers } from "next/headers";
import { hasAccess, authorizedUserOn, validateToken } from "@whop-apps/sdk";
import { getSites, getCategories } from "@/lib/db";
import Gallery from "@/components/Gallery";

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

  // Fetch data server-side so the gallery renders immediately with no loading flash
  const [sites, categories] = await Promise.all([
    getSites(companyId),
    getCategories(companyId),
  ]);

  return (
    <Gallery
      initialSites={sites}
      initialCategories={categories}
      isAdmin={isAdmin}
      companyId={companyId}
    />
  );
}
