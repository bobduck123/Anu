import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchPublicCollectionDetail } from "@/lib/api/public";

interface Props {
  params: Promise<{ slug: string; collectionId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, collectionId } = await params;
  try {
    const { node, collection } = await fetchPublicCollectionDetail(slug, collectionId);
    return {
      title: `${collection.title} — ${node.display_name}`,
      description: collection.description ?? undefined,
      openGraph: {
        title: `${collection.title} — ${node.display_name}`,
        description: collection.description ?? undefined,
        images: collection.cover_image_url ? [collection.cover_image_url] : undefined,
        type: "article",
      },
    };
  } catch {
    return { title: "Collection" };
  }
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug, collectionId } = await params;
  let detail;
  try {
    detail = await fetchPublicCollectionDetail(slug, collectionId);
  } catch {
    notFound();
  }

  const { node, collection, works } = detail;
  const visibleWorks = works.filter((w) => w.is_visible !== false);

  return (
    <div className="min-h-dvh bg-[var(--p-bg)]">
      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">

        <nav>
          <Link
            href={`/p/${slug}`}
            className="flex items-center gap-1.5 text-sm text-[var(--p-text-muted)] hover:text-[var(--p-text)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {node.display_name}
          </Link>
        </nav>

        {/* Collection header */}
        {collection.cover_image_url && (
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden">
            <Image
              src={collection.cover_image_url}
              alt={collection.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[var(--p-text)]">{collection.title}</h1>
          {collection.description && (
            <p className="text-base text-[var(--p-text-muted)] leading-relaxed">{collection.description}</p>
          )}
        </div>

        {/* Works in collection */}
        {visibleWorks.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">
              Works — {visibleWorks.length}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visibleWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/p/${slug}/works/${work.id}`}
                  className="group flex flex-col gap-2"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--p-surface-alt)]">
                    {(work.thumbnail_url ?? work.image_url) ? (
                      <Image
                        src={(work.thumbnail_url ?? work.image_url)!}
                        alt={work.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[var(--p-text-faint)] text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--p-text)] line-clamp-1">{work.title}</p>
                  {work.year && <p className="text-xs text-[var(--p-text-muted)]">{work.year}</p>}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <p className="text-sm text-[var(--p-text-muted)]">No works in this collection yet.</p>
        )}
      </main>
    </div>
  );
}
