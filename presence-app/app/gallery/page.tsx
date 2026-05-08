import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Grid3X3, MapPin } from "lucide-react";
import { listPublicPresences, type PublicPresenceCard } from "@/lib/api/public";

export const metadata = {
  title: "Presence Gallery",
  description:
    "Selected public Presences for artists, practitioners, venues, and cultural organisations.",
};

// Render server-side so the gallery never reveals a loading flash and
// public visitors see real published Presences without client JS.
export const dynamic = "force-dynamic";

const SEGMENTS: Array<{ key: string | null; label: string }> = [
  { key: null, label: "All" },
  { key: "artist_gallery", label: "Galleries" },
  { key: "studio_practice", label: "Studios" },
  { key: "editorial_portfolio", label: "Editorial" },
  { key: "minimal_portal", label: "Portals" },
  { key: "practitioner_profile", label: "Practitioners" },
  { key: "venue_profile", label: "Venues" },
];

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const filter = typeof params.filter === "string" ? params.filter : null;
  const search = typeof params.q === "string" ? params.q.slice(0, 80) : "";

  let items: PublicPresenceCard[] = [];
  let total = 0;
  let fetchError: string | null = null;
  try {
    const result = await listPublicPresences({
      limit: 24,
      offset: 0,
      ...(filter ? { display_mode: filter } : {}),
      ...(search ? { search } : {}),
    });
    items = result.items;
    total = result.total;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Gallery temporarily unavailable.";
  }

  return (
    <main className="min-h-dvh bg-[var(--p-bg)] px-5 py-8 text-[var(--p-text)] sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 hover:text-stone-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Presence
        </Link>

        <header className="flex flex-col gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-stone-950 text-white">
            <Grid3X3 className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">
            Public gallery
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-stone-950 sm:text-5xl">
            Presences in the public network.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-stone-600">
            A curated index of artists, practitioners, venues, and cultural
            organisations who have chosen to publish their public world. Drafts,
            private, suspended, and unassigned Presences never appear here.
          </p>
        </header>

        {/* Segment filter strip */}
        <nav aria-label="Filter by template" className="flex flex-wrap gap-2">
          {SEGMENTS.map((seg) => {
            const active = (seg.key ?? null) === (filter ?? null);
            const href = seg.key ? `/gallery?filter=${seg.key}` : "/gallery";
            return (
              <Link
                key={seg.label}
                href={href}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  active
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-950 hover:text-stone-950"
                }`}
              >
                {seg.label}
              </Link>
            );
          })}
        </nav>

        {/* Search form (server-rendered) */}
        <form action="/gallery" method="get" className="flex max-w-md gap-2">
          {filter && <input type="hidden" name="filter" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by name or headline"
            className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Search
          </button>
        </form>

        {fetchError ? (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Public gallery temporarily unavailable</p>
            <p className="mt-1">
              {fetchError}. The directory will reappear once the public list
              endpoint is reachable.
            </p>
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-[2rem] border border-stone-200 bg-white p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              {search || filter ? "No matches" : "Index opening"}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
              {search || filter
                ? "No published Presences match those filters yet."
                : "The first published Presences will appear here."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Drafts and private Presences never appear in this directory.
              Owners can share their canonical public route at{" "}
              <span className="font-mono">/p/[slug]</span> while in beta.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/auth/sign-up?returnTo=%2Fbeta%2Fonboarding"
                className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Start your Presence
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/plans"
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950"
              >
                See plans
              </Link>
            </div>
          </section>
        ) : (
          <>
            <p className="text-sm text-stone-500">
              {total} published {total === 1 ? "Presence" : "Presences"}
              {filter ? " in this template" : ""}
              {search ? ` matching “${search}”` : ""}.
            </p>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((card) => (
                <li key={card.id}>
                  <Link
                    href={`/p/${encodeURIComponent(card.slug)}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-xl shadow-stone-900/5 transition hover:-translate-y-0.5 hover:border-stone-400"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[linear-gradient(135deg,#e7ddd1,#d5c8b9)]">
                      {card.cover_image_url || card.profile_image_url ? (
                        <Image
                          src={(card.cover_image_url ?? card.profile_image_url)!}
                          alt={card.display_name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.22em] text-stone-500">
                          No cover yet
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-stone-500">
                        <span>{card.display_mode.replace(/_/g, " ")}</span>
                        {card.location_label && (
                          <span className="inline-flex items-center gap-1 text-stone-500">
                            <MapPin className="h-3 w-3" />
                            {card.location_label}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold leading-tight text-stone-950">
                        {card.display_name}
                      </h3>
                      {card.headline && (
                        <p className="text-sm leading-6 text-stone-600">
                          {card.headline}
                        </p>
                      )}
                      {card.bio_excerpt && (
                        <p className="text-xs leading-5 text-stone-500 line-clamp-3">
                          {card.bio_excerpt}
                        </p>
                      )}
                      <div className="mt-auto pt-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-900 group-hover:text-stone-700">
                          Open Presence
                          <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <section className="rounded-[2rem] border border-stone-200 bg-stone-50 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            How a Presence joins the gallery
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Sign up for public beta, complete onboarding, and shape your
            Presence in Studio. When you are ready, publish — and your public
            world becomes part of the network here.
          </p>
        </section>
      </div>
    </main>
  );
}
