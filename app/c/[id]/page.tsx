import { headers } from "next/headers";
import { hasAccess, authorizedUserOn, validateToken } from "@whop-apps/sdk";
import { getSites, getCategories, getCollections, DEFAULT_COLLECTION_ID } from "@/lib/db";
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

  const collections = await getCollections(companyId);

  // Resolve the collection by id. The "default" id always exists.
  let collectionName = "Default";
  let exists = id === DEFAULT_COLLECTION_ID;
  if (!exists) {
    const coll = collections.find((c) => c.id === id);
    if (coll) {
      collectionName = coll.name;
      exists = true;
    } else {
      collectionName = "Collection not found";
    }
  }

  const [sites, categories] = exists
    ? await Promise.all([getSites(companyId, id), getCategories(companyId, id)])
    : [[], []];

  return (
    <Gallery
      initialSites={sites}
      initialCategories={categories}
      initialCollections={collections}
      collectionId={id}
      collectionName={collectionName}
      isAdmin={isAdmin}
      companyId={companyId}
      notFound={!exists}
    />
  );
}
