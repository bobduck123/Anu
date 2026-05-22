import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Compass, MapPin, Sparkles, Sprout, Users } from "lucide-react";
import { listPublicPresences, type PublicPresenceCard } from "@/lib/api/public";

export const metadata = {
  title: "Beta Gallery — Presence",
  description:
    "A curated walk through Presence Rooms forming the first cultural network — artists, practitioners, venues, organisations.",
};

// Render server-side so the gallery never reveals a loading flash and
// public visitors see real published Presences without client JS.
export const dynamic = "force-dynamic";

const SEGMENTS: Array<{ key: string | null; label: string; sub: string }> = [
  { key: null, label: "All Rooms", sub: "every kind of practice" },
  { key: "artist_gallery", label: "Galleries", sub: "image fields, wall rhythm" },
  { key: "studio_practice", label: "Studios", sub: "process, fragments, traces" },
  { key: "editorial_portfolio", label: "Editorial", sub: "dossiers, thinking" },
  { key: "minimal_portal", label: "Portals", sub: "thresholds, magnetism" },
  { key: "practitioner_profile", label: "Practitioners", sub: "care pathways" },
  { key: "venue_profile", label: "Venues", sub: "places that gather" },
];

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const TONE_BY_MODE: Record<string, "quiet" | "sound" | "wood" | "archive" | "market"> = {
  minimal_portal: "quiet",
  artist_gallery: "quiet",
  studio_practice: "wood",
  editorial_portfolio: "archive",
  practitioner_profile: "quiet",
  venue_profile: "market",
};

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

  const feature = items[0];
  const rest = items.slice(1);

  return (
    <main className="presence-shell">
      <div className="presence-signal-field" aria-hidden />

      {/* Top frame */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          background: "color-mix(in oklab, var(--presence-paper) 86%, transparent)",
          borderBottom: "1px solid var(--presence-rule)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Link href="/" className="garden-brand" aria-label="Presence — home" style={{ textDecoration: "none" }}>
          <span className="glyph" aria-hidden />
          <span>Presence</span>
        </Link>
        <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/" className="presence-eyebrow" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--presence-on-paper)" }}>
            <ArrowLeft size={11} aria-hidden /> Presence
          </Link>
          <span className="presence-chip">Beta Gallery</span>
        </nav>
      </header>

      {/* Threshold */}
      <section className="presence-threshold presence-grain">
        <p className="threshold-eyebrow">Beta gallery · curated exhibition</p>
        <h1 className="threshold-display">
          The first Rooms,
          <br />
          <em>taking shape.</em>
        </h1>
        <p className="threshold-lede">
          Storefronts, Gardens, Halls, and Paths forming the first Presence
          network. Each Room is a cultural world under construction. Step
          inside, see what is forming, and watch the system grow.
        </p>
        <div className="threshold-actions">
          <Link href="/presence-chooser" className="presence-btn">
            Create your Room <ArrowRight size={14} aria-hidden />
          </Link>
          <Link href="/observer/garden" className="presence-btn is-ghost">
            <Sprout size={14} aria-hidden /> Enter as Observer
          </Link>
          <Link href="/design-lab" className="presence-btn is-ghost">
            <Sparkles size={14} aria-hidden /> Design lab · V2 previews
          </Link>
        </div>
      </section>

      {/* Filters strip */}
      <section className="presence-stack-section is-tight">
        <p className="presence-stack-eyebrow">
          <span className="num">01</span> Walk the gallery
        </p>
        <h2 className="presence-stack-title" style={{ fontSize: "clamp(28px, 3.6vw, 44px)" }}>
          Filter by mode of encounter.
        </h2>
        <p className="presence-stack-blurb">
          Each Room type is a different way of being publicly understandable.
          Galleries witness. Studios trace. Editorial dossiers explain.
          Portals withhold. Practitioners guide. Venues gather.
        </p>

        <nav
          aria-label="Filter by Room mode"
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {SEGMENTS.map((seg) => {
            const active = (seg.key ?? null) === (filter ?? null);
            const href = seg.key ? `/gallery?filter=${seg.key}` : "/gallery";
            return (
              <Link
                key={seg.label}
                href={href}
                className="observation-type-pill"
                aria-pressed={active}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  padding: "8px 12px",
                  textAlign: "left",
                  background: active ? "var(--presence-ink)" : "transparent",
                  color: active ? "var(--presence-bone)" : "var(--presence-on-paper-mute)",
                  borderColor: active ? "var(--presence-ink)" : "var(--presence-rule-strong)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 11, letterSpacing: "0.14em" }}>{seg.label}</span>
                <span
                  style={{
                    fontFamily: "var(--presence-f-display)",
                    fontStyle: "italic",
                    fontSize: 11.5,
                    letterSpacing: 0,
                    textTransform: "none",
                    opacity: 0.8,
                  }}
                >
                  {seg.sub}
                </span>
              </Link>
            );
          })}
        </nav>

        <form action="/gallery" method="get" style={{ marginTop: 20, display: "flex", gap: 8, maxWidth: 460 }}>
          {filter && <input type="hidden" name="filter" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by name or headline"
            aria-label="Search by name or headline"
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid var(--presence-rule-strong)",
              background: "var(--presence-bone)",
              color: "var(--presence-on-paper)",
              fontFamily: "var(--presence-f-ui)",
              fontSize: 14,
              borderRadius: 2,
            }}
          />
          <button type="submit" className="presence-btn is-small">Search</button>
        </form>
      </section>

      {/* Results */}
      <section className="presence-stack-section">
        {fetchError ? (
          <div className="presence-empty">
            <p className="presence-eyebrow" style={{ margin: 0 }}>Gallery temporarily unavailable</p>
            <p
              className="presence-display"
              style={{ margin: 0, fontSize: "clamp(22px, 2.4vw, 28px)", color: "var(--presence-on-paper)" }}
            >
              The public index is offline right now.
            </p>
            <p style={{ margin: 0, color: "var(--presence-on-paper-mute)", fontSize: 14 }}>{fetchError}</p>
            <Link href="/" className="presence-btn is-ghost is-small" style={{ marginTop: 8 }}>
              Back to Presence
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="presence-empty">
            <p className="presence-eyebrow" style={{ margin: 0 }}>
              {search || filter ? "No matches" : "Index opening"}
            </p>
            <p
              className="presence-display"
              style={{ margin: 0, fontSize: "clamp(22px, 2.4vw, 30px)" }}
            >
              {search || filter
                ? "No published Presences match those filters yet."
                : "The first published Presences will appear here."}
            </p>
            <p style={{ margin: 0, color: "var(--presence-on-paper-mute)", fontSize: 14, lineHeight: 1.55 }}>
              Drafts and private Presences never appear in the gallery. Owners can share their canonical public
              route at <span style={{ fontFamily: "var(--presence-f-mono)" }}>/p/[slug]</span> while in beta.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/auth/sign-up?returnTo=%2Fonboarding" className="presence-btn is-small">
                Start your Presence <ArrowRight size={14} aria-hidden />
              </Link>
              <Link href="/plans" className="presence-btn is-ghost is-small">
                See plans
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p
              className="presence-eyebrow"
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}
            >
              <span>
                {total} published {total === 1 ? "Room" : "Rooms"}
                {filter ? " · " + (SEGMENTS.find((s) => s.key === filter)?.label ?? "filtered") : ""}
                {search ? ` matching “${search}”` : ""}
              </span>
              <span className="status-pill" data-status="beta">Beta</span>
            </p>

            <div className="presence-gallery-grid is-feature">
              {feature && (
                <Link
                  href={`/p/${encodeURIComponent(feature.slug)}`}
                  className="presence-room-card is-feature"
                  data-tone={TONE_BY_MODE[feature.display_mode] ?? "quiet"}
                >
                  <div className="card-art" data-tone={TONE_BY_MODE[feature.display_mode] ?? "quiet"}>
                    {(feature.cover_image_url || feature.profile_image_url) && (
                      <Image
                        src={(feature.cover_image_url ?? feature.profile_image_url)!}
                        alt={feature.display_name}
                        fill
                        style={{ objectFit: "cover", opacity: 0.94 }}
                      />
                    )}
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        zIndex: 2,
                      }}
                    >
                      <span className="status-pill" data-status="live">Live</span>
                      <span className="presence-eyebrow on-stage" style={{ color: "var(--presence-on-stage-mute)" }}>
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="card-eyebrow">
                      {feature.display_mode.replace(/_/g, " ")}
                      {feature.location_label && (
                        <>
                          {" · "}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={10} aria-hidden /> {feature.location_label}
                          </span>
                        </>
                      )}
                    </p>
                    <h3 className="card-name">{feature.display_name}</h3>
                    {feature.headline && <p className="card-summary">{feature.headline}</p>}
                    <span
                      className="presence-link-underline"
                      style={{ marginTop: "auto", color: "var(--presence-vermilion)", fontWeight: 500 }}
                    >
                      Enter Room <ArrowRight size={14} aria-hidden />
                    </span>
                  </div>
                </Link>
              )}

              {rest.map((card) => (
                <Link
                  key={card.id}
                  href={`/p/${encodeURIComponent(card.slug)}`}
                  className="presence-room-card"
                >
                  <div className="card-art" data-tone={TONE_BY_MODE[card.display_mode] ?? "quiet"}>
                    {(card.cover_image_url || card.profile_image_url) && (
                      <Image
                        src={(card.cover_image_url ?? card.profile_image_url)!}
                        alt={card.display_name}
                        fill
                        style={{ objectFit: "cover", opacity: 0.94 }}
                      />
                    )}
                  </div>
                  <div className="card-body">
                    <p className="card-eyebrow">
                      {card.display_mode.replace(/_/g, " ")}
                      {card.location_label && (
                        <>
                          {" · "}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={10} aria-hidden /> {card.location_label}
                          </span>
                        </>
                      )}
                    </p>
                    <h3 className="card-name">{card.display_name}</h3>
                    {card.headline && <p className="card-summary">{card.headline}</p>}
                    <span
                      style={{
                        marginTop: "auto",
                        color: "var(--presence-vermilion)",
                        fontFamily: "var(--presence-f-mono)",
                        fontSize: 11,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Enter Room →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* What is forming — Halls + Gardens + Paths teaser cards */}
      <section className="presence-stack-section">
        <p className="presence-stack-eyebrow">
          <span className="num">02</span> What is forming
        </p>
        <h2 className="presence-stack-title">
          Storefronts, Gardens, Halls,
          <br />
          and Paths — all <em>connecting.</em>
        </h2>
        <p className="presence-stack-blurb">
          The Rooms above are storefronts. Around them, the wider Presence
          network is taking shape — Observer Gardens, shared Halls, Paths
          between places, and a hidden World still forming.
        </p>

        <div className="presence-layer-grid">
          <Link href="/observer/garden" className="presence-layer-card" data-layer="gardens">
            <span className="layer-verb">
              <Sprout size={12} aria-hidden style={{ marginRight: 8 }} /> Be known by taste
            </span>
            <h3 className="layer-name">Gardens</h3>
            <p className="layer-blurb">
              An Observer Mask cultivates a Garden — Seeds from Rooms,
              Mood Boards, and people you share space with.
            </p>
            <span className="layer-action">
              Open your Garden <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
          <Link href="/halls" className="presence-layer-card" data-layer="halls">
            <span className="layer-verb">
              <Users size={12} aria-hidden style={{ marginRight: 8 }} /> Gather
            </span>
            <h3 className="layer-name">Halls</h3>
            <p className="layer-blurb">
              Town Halls, Salons, Market Halls, Listening Halls — shared
              digital gathering spaces with zones, stalls, and portals.
            </p>
            <span className="layer-action">
              Browse Halls <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
          <Link href="/world" className="presence-layer-card" data-layer="world">
            <span className="layer-verb">
              <Compass size={12} aria-hidden style={{ marginRight: 8 }} /> Open later
            </span>
            <h3 className="layer-name">World</h3>
            <p className="layer-blurb">
              The Presence World is forming. Not a fake map — a real cultural
              network growing one Room, Garden, and Hall at a time.
            </p>
            <span className="layer-action">
              See what is forming <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        </div>
      </section>

      {/* How a Presence joins the gallery */}
      <section className="presence-stack-section is-tight">
        <div
          className="presence-card"
          style={{
            padding: 28,
            background: "var(--presence-bone)",
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          <p className="presence-eyebrow" style={{ margin: 0 }}>
            How a Presence joins the gallery
          </p>
          <h3
            className="presence-display"
            style={{
              margin: 0,
              fontSize: "clamp(22px, 2.4vw, 28px)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              maxWidth: "30ch",
            }}
          >
            Sign up for the public beta, complete onboarding, and shape your
            Room in Studio. When you publish, your public world becomes part
            of the network here.
          </h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/auth/sign-up?returnTo=%2Fonboarding" className="presence-btn is-small">
              Start your Presence <ArrowRight size={14} aria-hidden />
            </Link>
            <Link href="/plans" className="presence-btn is-ghost is-small">See plans</Link>
            <Link href="/design-lab" className="presence-btn is-ghost is-small">
              <Sparkles size={14} aria-hidden /> View design direction
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
