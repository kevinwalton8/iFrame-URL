import { headers } from "next/headers";
import { validateToken } from "@whop-apps/sdk";
import { getCollections } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmbedPage({ params }: PageProps) {
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

  const collections = await getCollections(companyId);
  const embed = collections.find((c) => c.id === id);

  if (!embed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-white/50">Embed not found</p>
        <a href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">← Back</a>
      </div>
    );
  }

  // Code embed — render raw HTML via srcdoc
  if (embed.embedType === "code" || embed.code) {
    if (!embed.code) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-white/50">No code configured for &ldquo;{embed.name}&rdquo;</p>
          <a href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">← Back</a>
        </div>
      );
    }
    return (
      <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
        <iframe
          srcDoc={embed.code}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          allowFullScreen
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  // URL embed
  if (!embed.url) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-white/50">No URL configured for &ldquo;{embed.name}&rdquo;</p>
        <a href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">← Back</a>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
      <iframe
        src={embed.url}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allowFullScreen
        allow="fullscreen; clipboard-read; clipboard-write"
      />
    </div>
  );
}
