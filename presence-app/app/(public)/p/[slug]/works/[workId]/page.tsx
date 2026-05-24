import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { fetchPublicWorkDetail } from "@/lib/api/public";
import { fetchDemoOrPublicNode } from "@/lib/presence/demo/fetch";
import { Chip } from "@/components/ui";
import { isGgmFaithfulRoom } from "@/lib/presence/ggm/activate";
import { ggmWorkBySlug } from "@/lib/presence/ggm/source";
import GgmFaithfulRoom from "@/components/presence/ggm/GgmFaithfulRoom";
import { resolveRenderModel } from "@/lib/presence/render/resolver";

interface Props {
  params: Promise<{ slug: string; workId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, workId } = await params;
  try {
    const { node, work } = await fetchPublicWorkDetail(slug, workId);
    return {
      title: `${work.title} — ${node.display_name}`,
      description: work.description ?? undefined,
      openGraph: {
        title: `${work.title} — ${node.display_name}`,
        description: work.description ?? undefined,
        images: work.image_url ? [work.image_url] : undefined,
        type: "article",
      },
    };
  } catch {
    // GGM fallback metadata when the backend doesn't yet hold the work.
    const ggm = ggmWorkBySlug(workId);
    if (ggm) {
      return {
        title: `${ggm.title} — Christina Kerkvliet Goddard`,
        description: ggm.description,
      };
    }
    return { title: "Work" };
  }
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug, workId } = await params;

  // GGM faithful renderer path. We try the standard backend work-detail
  // fetch first; if the backend has the work it wins. Otherwise — and for
  // every GGM Room as identified by `isGgmFaithfulRoom` — we render the
  // faithful detail UI from our canonical source content.
  let detail;
  try {
    detail = await fetchPublicWorkDetail(slug, workId);
  } catch {
    // Detail not available in backend — only retry through GGM faithful
    // path if the Room itself is recognised as GGM.
    try {
      const node = await fetchDemoOrPublicNode(slug);
      if (isGgmFaithfulRoom(node)) {
        return <GgmFaithfulRoom node={node} model={resolveRenderModel(node, "published")} focusWorkSlug={workId} />;
      }
    } catch {
      // ignore — falls through to notFound below.
    }
    notFound();
  }

  const { node, work, collection } = detail;

  // If the Room is GGM, prefer the faithful detail surface even when the
  // backend returned data.
  if (isGgmFaithfulRoom(node)) {
    return <GgmFaithfulRoom node={node} model={resolveRenderModel(node, "published")} focusWorkSlug={workId} />;
  }

  return (
    <div className="min-h-dvh bg-[var(--p-bg)]">
      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Back nav */}
        <nav className="flex items-center gap-2">
          <Link
            href={`/p/${slug}`}
            className="flex items-center gap-1.5 text-sm text-[var(--p-text-muted)] hover:text-[var(--p-text)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {node.display_name}
          </Link>
          {collection && (
            <>
              <span className="text-[var(--p-text-faint)]">/</span>
              <Link
                href={`/p/${slug}/collections/${collection.id}`}
                className="text-sm text-[var(--p-text-muted)] hover:text-[var(--p-text)] transition-colors"
              >
                {collection.title}
              </Link>
            </>
          )}
        </nav>

        {/* Hero image */}
        {(work.image_url || work.thumbnail_url) && (
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden">
            <Image
              src={(work.image_url ?? work.thumbnail_url)!}
              alt={work.title}
              fill
              className="object-contain bg-[var(--p-surface-alt)]"
              priority
            />
          </div>
        )}

        {/* Work meta */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--p-text)]">{work.title}</h1>
            {work.year && <p className="text-[var(--p-text-muted)] mt-1">{work.year}</p>}
          </div>

          {(work.medium || work.dimensions) && (
            <div className="flex flex-wrap gap-2">
              {work.medium && <Chip variant="muted">{work.medium}</Chip>}
              {work.dimensions && <Chip variant="muted">{work.dimensions}</Chip>}
              {work.availability_status && (
                <Chip variant={work.availability_status === "available" ? "accent" : "muted"}>
                  {work.availability_status}
                </Chip>
              )}
            </div>
          )}

          {work.description && (
            <p className="text-base text-[var(--p-text)] leading-relaxed whitespace-pre-wrap">
              {work.description}
            </p>
          )}

          {work.exhibition_history && (
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">
                Exhibition history
              </h2>
              <p className="text-sm text-[var(--p-text)] whitespace-pre-wrap">{work.exhibition_history}</p>
            </div>
          )}

          {work.price_label && (
            <p className="text-sm font-medium text-[var(--p-text)]">{work.price_label}</p>
          )}

          {work.external_url && (
            <a
              href={work.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--p-accent)] font-medium hover:underline"
            >
              View more <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Gallery images */}
        {work.gallery_images && work.gallery_images.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {work.gallery_images.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                <Image src={url} alt={`${work.title} detail ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
