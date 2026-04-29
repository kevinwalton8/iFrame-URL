import { headers } from "next/headers";
import { hasAccess, authorizedUserOn, validateToken } from "@whop-apps/sdk";
import { getSites, getCategories, getCollections } from "@/lib/db";
import Gallery from "@/components/Gallery";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;
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

  const [allSites, categories, collections] = await Promise.all([
    getSites(companyId),
    getCategories(companyId),
    getCollections(companyId),
  ]);

  const collection = collections.find((c) => c.id === id);
  const exists = !!collection;
  const filteredSites = exists
    ? allSites.filter((s) => s.collections?.includes(id))
    : [];

  return (
    <Gallery
      initialSites={filteredSites}
      initialCategories={categories}
      initialCollections={collections}
      currentCollectionId={id}
      currentCollectionName={collection?.name ?? "Collection not found"}
      isAdmin={isAdmin}
      companyId={companyId}
      notFound={!exists}
    />
  );
}
