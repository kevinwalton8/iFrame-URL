import { headers } from "next/headers";
import { hasAccess, authorizedUserOn } from "@whop-apps/sdk";
import { getSites, getCategories } from "@/lib/db";
import Gallery from "@/components/Gallery";

const COMPANY_ID = process.env.WHOP_COMPANY_ID ?? "";

export default async function Home() {
  const hdrs = await headers();

  let isAdmin = process.env.DEV_ADMIN === "true";

  if (!isAdmin && COMPANY_ID) {
    try {
      isAdmin = await hasAccess({
        to: authorizedUserOn(COMPANY_ID),
        headers: hdrs,
      });
    } catch {
      isAdmin = false;
    }
  }

  const [sites, categories] = await Promise.all([getSites(), getCategories()]);

  return <Gallery initialSites={sites} initialCategories={categories} isAdmin={isAdmin} />;
}
