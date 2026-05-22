import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  DoorOpen,
  Mic2,
  Sparkles,
  Users,
} from "lucide-react";

export const metadata = {
  title: "Design Lab — Presence V2 previews",
  description:
    "Non-production design previews of the Presence world layers — spatial Halls, World districts, Stall markets, Seed lifecycle, Listening Halls. Not live. Not realtime.",
};

const SEED_STATES: Array<{ state: string; label: string; blurb: string }> = [
  { state: "active", label: "Active", blurb: "Recently arrived, growing." },
  { state: "recently_watered", label: "Watered", blurb: "Nurtured this week." },
  { state: "wilting", label: "Wilting", blurb: "Fading. Nurture or prune." },
  { state: "composted", label: "Composted", blurb: "Old soil. Memory kept." },
  { state: "pruned", label: "Pruned", blurb: "Won’t grow in your Garden." },
  { state: "blocked", label: "Blocked", blurb: "Not shown anywhere." },
];

export default function DesignLabPage() {
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
        <Link
          href="/"
          className="garden-brand"
          aria-label="Presence — home"
          style={{ textDecoration: "none" }}
        >
          <span className="glyph" aria-hidden />
          <span>Presence</span>
        </Link>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link
            href="/gallery"
            className="presence-eyebrow"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--presence-on-paper)" }}
          >
            <ArrowLeft size={11} aria-hidden /> Beta Gallery
          </Link>
          <span className="status-pill" data-status="preview">
            Design lab · V2 preview
          </span>
        </div>
      </header>

      {/* V2 banner — global warning */}
      <div style={{ padding: "20px 24px 0" }}>
        <div className="v2-banner" role="status">
          <span className="v2-tag">V2 preview</span>
          <p className="v2-msg">
            Everything below is a non-production design draft. These previews
            are static visualisations of where Presence is heading — spatial
            Halls, a forming World, a Mask economy. They are not live, not
            multiplayer, and not connected to backend state.
          </p>
          <Link
            href="/"
            className="presence-link-underline"
            style={{ fontSize: 13, color: "var(--presence-vermilion)" }}
          >
            Back to V1
          </Link>
        </div>
      </div>

      {/* Threshold */}
      <section className="presence-threshold presence-grain">
        <p className="threshold-eyebrow">
          <span aria-hidden style={{ color: "var(--presence-brass)" }}>●</span>{" "}
          Design lab · V2 prototypes
        </p>
        <h1 className="threshold-display">
          What Presence
          <br />
          <em>could feel like.</em>
        </h1>
        <p className="threshold-lede">
          A walking tour of the design directions ahead — game-adjacent shared
          Halls, a Presence World that opens slowly, Rooms appearing as
          storefront stalls inside Markets, and a visible Garden lifecycle.
          None of this is live yet. All of it is on the roadmap.
        </p>
        <div className="threshold-actions">
          <Link href="/halls" className="presence-btn">
            See live V1 Halls <ArrowRight size={14} aria-hidden />
          </Link>
          <Link href="/world" className="presence-btn is-ghost">
            World, forming
          </Link>
        </div>
      </section>

      {/* Preview 1 — Spatial Hall */}
      <section className="presence-stack-section" id="spatial-hall">
        <p className="presence-stack-eyebrow">
          <span className="num">01</span> Spatial Hall preview
        </p>
        <h2 className="presence-stack-title">
          Hall as <em>room</em>, not feed.
        </h2>
        <p className="presence-stack-blurb">
          A Hall becomes a place you can stand inside. A central Stage, a
          host Mask, Tables in the foreground, a floor that anchors the
          space. Masks present in a Hall surface as soft markers — never as
          fake live multiplayer. Polling-ready in V1; we will add real-time
          presence only when the system can support it cleanly.
        </p>

        <div className="v2-spatial-hall" style={{ marginTop: 28 }} aria-hidden>
          <div className="stage-light" />
          <div className="stage" />
          <div className="floor" />
          <div className="mask is-vermilion" style={{ left: "48%", top: "44%" }} />
          <div className="mask is-moss" style={{ left: "38%", top: "62%" }} />
          <div className="mask" style={{ left: "58%", top: "62%" }} />
          <div className="mask is-moss" style={{ left: "30%", top: "74%" }} />
          <div className="mask" style={{ left: "66%", top: "74%" }} />
          <div className="mask is-vermilion" style={{ left: "44%", top: "82%" }} />
          <div className="mask" style={{ left: "54%", top: "84%" }} />
          <span className="label" style={{ top: 18, left: 18 }}>
            Hall · Listening Hall
          </span>
          <span className="label" style={{ top: 18, right: 18 }}>
            7 Masks present (concept)
          </span>
          <span className="label" style={{ bottom: 14, left: "50%", transform: "translateX(-50%)" }}>
            Stage · Tables · Lobby · Portals
          </span>
        </div>

        <p className="presence-stack-blurb" style={{ marginTop: 16, fontSize: 13.5 }}>
          <em>Status:</em> design prototype. <em>Behaviour:</em> static. <em>What's real today:</em> the same Hall in flat zones at <Link href="/halls" className="presence-link-underline">/halls</Link>.
        </p>
      </section>

      {/* Preview 2 — Market Hall stalls */}
      <section className="presence-stack-section" id="market-hall">
        <p className="presence-stack-eyebrow">
          <span className="num">02</span> Market Hall stalls
        </p>
        <h2 className="presence-stack-title">
          Rooms as <em>storefront stalls</em>
          <br /> inside a Market Hall.
        </h2>
        <p className="presence-stack-blurb">
          A Hall can host a row of Stalls — each one a Presence Room. Stalls
          let visitors step inside a Room without leaving the Hall. The
          Market Hall reads as a place; the Stall is a door.
        </p>

        <div className="v2-stall-row" style={{ marginTop: 28 }}>
          {[
            { name: "Mara Vale", mode: "Studio Practice" },
            { name: "Kira Stone", mode: "Gallery Wall" },
            { name: "Atelier Index", mode: "Editorial Portfolio" },
            { name: "Black Room Studies", mode: "Minimal Portal" },
            { name: "Salt House", mode: "Venue Profile" },
            { name: "Soft Method", mode: "Practitioner Presence" },
          ].map((stall) => (
            <article className="stall" key={stall.name}>
              <span className="stall-mode">{stall.mode}</span>
              <h3 className="stall-name">{stall.name}</h3>
              <span className="stall-action">Enter Room →</span>
            </article>
          ))}
        </div>
      </section>

      {/* Preview 3 — Garden Seed lifecycle */}
      <section className="presence-stack-section" id="seed-lifecycle">
        <p className="presence-stack-eyebrow">
          <span className="num">03</span> Garden Seed lifecycle
        </p>
        <h2 className="presence-stack-title">
          Seeds visibly <em>live and decay.</em>
        </h2>
        <p className="presence-stack-blurb">
          The Garden ecology is the visible lifecycle of attention. A Seed
          arrives, gets watered, may wilt, compost, get pruned, or be
          blocked. Today the states render as a left-rule colour on Seed
          cards. In V2 they will animate over time and across the Garden as
          a whole.
        </p>

        <div
          className="v2-seed-lifecycle"
          style={{
            marginTop: 24,
            // Override the legacy 6-col rule via inline style so phones get
            // an auto-fitting grid regardless of CSS-cache staleness.
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          }}
        >
          {SEED_STATES.map((s) => (
            <div key={s.state} className="state" data-state={s.state}>
              <span className="dot" aria-hidden />
              <span className="label">{s.label}</span>
              <span className="blurb">{s.blurb}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Preview 4 — World cluster */}
      <section className="presence-stack-section" id="world-cluster">
        <p className="presence-stack-eyebrow">
          <span className="num">04</span> Presence World preview
        </p>
        <h2 className="presence-stack-title">
          Not a map yet —
          <br />
          <em>symbolic districts.</em>
        </h2>
        <p className="presence-stack-blurb">
          The World will not arrive as a fake map. It will form as
          districts — Rooms, Gardens, Halls, Paths — pulling together
          over time. Until then, the World remains intentionally hidden,
          and only its forming structure is visible.
        </p>

        <div className="v2-world-cluster" style={{ marginTop: 28 }} aria-hidden>
          <div className="district" data-kind="rooms">Rooms</div>
          <div className="district" data-kind="gardens">Gardens</div>
          <div className="district" data-kind="halls">Halls</div>
          <div className="district" data-kind="paths">Paths</div>
          <div className="path-line" style={{ left: "20%", top: "32%", width: "60%", transform: "rotate(8deg)" }} />
          <div className="path-line" style={{ left: "30%", top: "60%", width: "50%", transform: "rotate(-12deg)" }} />
          <div className="path-line" style={{ left: "26%", top: "78%", width: "44%", transform: "rotate(6deg)" }} />
          <div className="locked">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Compass size={11} aria-hidden /> Hidden / forming — not a fake map
            </span>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Link href="/world" className="presence-btn is-ghost is-small">
            Read the V1 World forming page <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Preview 5 — Listening Hall */}
      <section className="presence-stack-section" id="listening-hall">
        <p className="presence-stack-eyebrow">
          <span className="num">05</span> Listening Hall
        </p>
        <h2 className="presence-stack-title">
          A stage, a host, an
          <br />
          audience of <em>Masks.</em>
        </h2>
        <p className="presence-stack-blurb">
          The Listening Hall is the simplest spatial Hall — a small stage, a
          host Mask, attendee Masks, an Observations Noticeboard. Designed
          for music premieres, conversations, panel-style sessions, and
          curated salons.
        </p>

        <div className="v2-listening-hall" style={{ marginTop: 28 }} aria-hidden>
          <div className="platform" />
          <div className="platform-host" />
          <div className="audience">
            {Array.from({ length: 36 }).map((_, i) => (
              <div className="mask" key={i} />
            ))}
          </div>
          <span
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              fontFamily: "var(--presence-f-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--presence-on-stage-mute)",
            }}
          >
            Hall · Listening
          </span>
          <span
            style={{
              position: "absolute",
              top: "30%",
              left: "50%",
              transform: "translate(-50%, -100%)",
              fontFamily: "var(--presence-f-display)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--presence-brass)",
            }}
          >
            Host
          </span>
        </div>
      </section>

      {/* Preview 6 — Teleport menu */}
      <section className="presence-stack-section" id="teleport">
        <p className="presence-stack-eyebrow">
          <span className="num">06</span> Teleport
        </p>
        <h2 className="presence-stack-title">
          Game-adjacent <em>fast travel.</em>
        </h2>
        <p className="presence-stack-blurb">
          The Teleport menu jumps between Gardens, Rooms, Halls, Paths,
          Studio, and Mood Boards without the usual click-back-click web
          rhythm. It lives in every shell already (open it from the top-right
          on Gardens and Halls). The V2 direction is a richer overlay with
          recent encounters and inside-Hall zone targets.
        </p>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {[
            ["My Garden", "G"],
            ["Halls", "H"],
            ["Passport", "P"],
            ["Mood Boards", "M"],
            ["Rooms", "R"],
            ["Studio", "S"],
            ["Create Room", "+"],
            ["World forming", "W"],
          ].map(([label, kbd]) => (
            <div
              key={label as string}
              className="presence-card"
              style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--presence-bone)" }}
            >
              <span style={{ fontFamily: "var(--presence-f-display)", fontSize: 18 }}>{label}</span>
              <span className="presence-eyebrow" style={{ margin: 0 }}>⌘{kbd}</span>
            </div>
          ))}
        </div>
      </section>

      {/* V2 readiness summary */}
      <section className="presence-stack-section is-tight">
        <div
          className="presence-card"
          style={{
            padding: 24,
            background: "var(--presence-bone)",
            display: "grid",
            gap: 16,
          }}
        >
          <p className="presence-eyebrow" style={{ margin: 0 }}>
            Status
          </p>
          <h3
            className="presence-display"
            style={{ margin: 0, fontSize: "clamp(22px, 2.4vw, 28px)" }}
          >
            Each draft is a direction, not a delivery.
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {[
              ["01 · Spatial Hall", "Static visual. V1 Halls render in flat zones today."],
              ["02 · Market Hall stalls", "Static layout. Real Stalls already work inside V1 Halls."],
              ["03 · Seed lifecycle", "Live state colours render today; animated lifecycle is V2."],
              ["04 · World cluster", "Concept art. World stays hidden in V1; this is a future shape."],
              ["05 · Listening Hall", "Static visual. Polling-ready Hall sessions exist in V1."],
              ["06 · Teleport menu", "Already live; richer overlay coming."],
            ].map(([k, v]) => (
              <li
                key={k as string}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px dashed var(--presence-rule)",
                  fontSize: 13.5,
                  color: "var(--presence-on-paper-mute)",
                }}
              >
                <span className="presence-eyebrow" style={{ margin: 0 }}>{k}</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/gallery" className="presence-btn is-small">
              <DoorOpen size={14} aria-hidden /> Back to Beta Gallery
            </Link>
            <Link href="/halls" className="presence-btn is-ghost is-small">
              <Users size={14} aria-hidden /> See live Halls
            </Link>
            <Link href="/observer/garden" className="presence-btn is-ghost is-small">
              <Sparkles size={14} aria-hidden /> See live Gardens
            </Link>
            <Link href="/world" className="presence-btn is-ghost is-small">
              <Mic2 size={14} aria-hidden /> World forming
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
