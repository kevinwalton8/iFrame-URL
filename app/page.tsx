import { headers } from "next/headers";
import { hasAccess, authorizedUserOn, validateToken } from "@whop-apps/sdk";
import { getSites, getCategories } from "@/lib/db";
import Gallery from "@/components/Gallery";

export default async function Home() {
  const hdrs = await headers();

  // Resolve the company ID from the live Whop session token, falling back
  // to the env var for local dev. This is what makes the app multi-tenant.
  let companyId = process.env.WHOP_COMPANY_ID ?? "";
  try {
    const tokenData = await validateToken({ headers: hdrs, dontThrow: true });
    if (tokenData?.appId) {
      // appId format: "app_XYZ:biz_ABC" — extract the biz portion if present
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
      isAdmin = await hasAccess({
        to: authorizedUserOn(companyId),
        headers: hdrs,
      });
    } catch {
      isAdmin = false;
    }
  }

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
