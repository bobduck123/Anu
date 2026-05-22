import Link from "next/link";
import {
  ArrowRight,
  Compass,
  DoorOpen,
  Footprints,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";

export const metadata = {
  title: "Presence — not a profile, a place people can enter.",
  description:
    "Presence is where your digital storefront, social garden, and shared hall come together. Rooms, Gardens, Halls, Paths — one Presence network.",
};

const LAYERS = [
  {
    id: "rooms",
    verb: "Enter",
    name: "Rooms",
    blurb:
      "Premium public spaces for artists, practitioners, venues, organisations, and personal practices. Tap an NFC card or scan a QR — your Room opens.",
    href: "/presence-chooser",
    action: "Open a Room",
  },
  {
    id: "gardens",
    verb: "Be known by taste",
    name: "Gardens",
    blurb:
      "An Observer Mask cultivates a Garden — Seeds from Rooms you entered, Halls you joined, Paths you walked. Not a feed. A social ecosystem.",
    href: "/observer/garden",
    action: "Open your Garden",
  },
  {
    id: "halls",
    verb: "Gather",
    name: "Halls",
    blurb:
      "Town squares, salons, market halls, listening halls. Shared digital gathering spaces with zones — Lobby, Stage, Tables, Stalls, Noticeboards, Portals.",
    href: "/halls",
    action: "Browse Halls",
  },
  {
    id: "paths",
    verb: "Move",
    name: "Paths",
    blurb:
      "Paths are exploration. Choose a direction — follow the mood, follow the place, follow the influences, follow people from this Hall, surprise me.",
    href: "/world",
    action: "See how Paths grow",
  },
  {
    id: "world",
    verb: "Open later",
    name: "World",
    blurb:
      "The Presence World is forming. Rooms become Paths become a shared cultural map — when enough places, paths, and traces have taken root.",
    href: "/world",
    action: "World, forming",
  },
] as const;

const PROBLEMS = [
  {
    label: "01 · Dead links",
    body: "Linktree-style hubs that flatten cultural work into a list of squares.",
  },
  {
    label: "02 · Scattered social",
    body: "Profiles across five platforms, each owned by someone else's feed algorithm.",
  },
  {
    label: "03 · Boring portfolios",
    body: "Beige Squarespace templates that hide the practice they're supposed to introduce.",
  },
  {
    label: "04 · Stateless feeds",
    body: "Social spaces with no memory of where you've been or what you've cared about.",
  },
  {
    label: "05 · Disconnected encounters",
    body: "NFC business cards that point at a website that points at nothing else.",
  },
];

export default function HomePage() {
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
          background:
            "color-mix(in oklab, var(--presence-paper) 86%, transparent)",
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
        <nav
          aria-label="Primary"
          style={{ display: "flex", gap: 20, alignItems: "center" }}
        >
          <Link href="/gallery" className="presence-eyebrow hidden sm:inline-block" style={{ textDecoration: "none", color: "var(--presence-on-paper)" }}>
            Gallery
          </Link>
          <Link href="/halls" className="presence-eyebrow hidden sm:inline-block" style={{ textDecoration: "none", color: "var(--presence-on-paper)" }}>
            Halls
          </Link>
          <Link href="/observer/garden" className="presence-eyebrow hidden sm:inline-block" style={{ textDecoration: "none", color: "var(--presence-on-paper)" }}>
            Garden
          </Link>
          <Link href="/world" className="presence-eyebrow hidden sm:inline-block" style={{ textDecoration: "none", color: "var(--presence-on-paper)" }}>
            World
          </Link>
          <Link href="/auth/sign-in" className="presence-btn is-ghost is-small" style={{ marginLeft: 6 }}>
            Sign in
          </Link>
        </nav>
      </header>

      {/* Threshold — opening hero */}
      <section className="presence-threshold presence-grain" aria-labelledby="hero-title">
        <p className="threshold-eyebrow">
          <span aria-hidden style={{ color: "var(--presence-vermilion)" }}>
            ●
          </span>{" "}
          Presence · cultural world interface · v1 beta
        </p>
        <h1 id="hero-title" className="threshold-display">
          Not a profile.
          <br />
          <em>A place</em> people can enter.
        </h1>
        <p className="threshold-lede">
          Presence is where your digital storefront, social garden, and shared
          hall come together. Tap an NFC card. Scan a QR poster. Walk a Path
          between Rooms. Plant a Seed in a Garden. Gather in a Hall.
        </p>
        <div className="threshold-actions">
          <Link href="/presence-chooser" className="presence-btn">
            Create a Presence Room <ArrowRight size={14} aria-hidden />
          </Link>
          <Link href="/gallery" className="presence-btn is-ghost">
            Enter the Beta Gallery
          </Link>
          <Link
            href="/observer/garden"
            className="presence-btn is-ghost"
            style={{ display: "inline-flex" }}
          >
            Join as Observer
          </Link>
        </div>

        <div className="presence-marquee" aria-hidden>
          <div className="presence-marquee-track">
            {[
              "Rooms let you be entered",
              "Gardens let you be known by taste",
              "Halls let you gather",
              "Paths let you move",
              "The World opens later",
            ]
              .concat([
                "Rooms let you be entered",
                "Gardens let you be known by taste",
                "Halls let you gather",
                "Paths let you move",
                "The World opens later",
              ])
              .map((line, i) => (
                <span key={`${line}-${i}`}>
                  {line}
                  <span className="dot" />
                </span>
              ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="presence-stack-section">
        <span className="presence-stack-eyebrow">
          <span className="num">01</span> The problem
        </span>
        <h2 className="presence-stack-title">
          The web flattened culture
          <br />
          into <em>tabs and feeds.</em>
        </h2>
        <p className="presence-stack-blurb">
          Real practices — artists, practitioners, venues, organisations,
          collectives, tradespeople — get reduced to a Wix template or a
          Linktree hub. The encounters that actually matter happen offline,
          and then there&apos;s nowhere for them to take root.
        </p>
        <div className="presence-problem-row">
          {PROBLEMS.map((p) => (
            <div className="item" key={p.label}>
              <p className="label">{p.label}</p>
              <p className="body">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The Presence Stack */}
      <section className="presence-stack-section">
        <span className="presence-stack-eyebrow">
          <span className="num">02</span> The Presence stack
        </span>
        <h2 className="presence-stack-title">
          Five layers, one
          <br />
          <em>cultural world.</em>
        </h2>
        <p className="presence-stack-blurb">
          Each layer has a primary verb. Each layer is designed, not generic.
          Each layer connects to the next. You can adopt them in order — start
          with a Room, grow into a Garden, host a Hall.
        </p>
        <div className="presence-layer-grid">
          {LAYERS.map((layer) => (
            <Link
              key={layer.id}
              href={layer.href}
              className="presence-layer-card"
              data-layer={layer.id}
            >
              <span className="layer-verb">
                <span aria-hidden style={{ marginRight: 8 }}>
                  {layer.id === "rooms" && <DoorOpen size={12} />}
                  {layer.id === "gardens" && <Sprout size={12} />}
                  {layer.id === "halls" && <Users size={12} />}
                  {layer.id === "paths" && <Footprints size={12} />}
                  {layer.id === "world" && <Compass size={12} />}
                </span>
                {layer.verb}
              </span>
              <h3 className="layer-name">{layer.name}</h3>
              <p className="layer-blurb">{layer.blurb}</p>
              <span className="layer-action">
                {layer.action} <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Room-first business value (Rooms) */}
      <section className="presence-stack-section">
        <span className="presence-stack-eyebrow">
          <span className="num">03</span> Rooms · storefronts
        </span>
        <h2 className="presence-stack-title">
          Your Room is a living
          <br />
          <em>business card</em> with a memory.
        </h2>
        <p className="presence-stack-blurb">
          Presence Rooms are premium public spaces designed for artists,
          practitioners, consultants, venues, organisations, and personal
          practices. Tap an NFC card or scan a QR — the Room opens, the
          encounter is captured, and the visitor can save, walk a Path, or
          send an enquiry.
        </p>
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {[
            ["NFC / QR / badge entry", "Tap, scan, or share. Every Room Key is trackable."],
            ["Portfolio & services", "Works, collections, programmes, and offerings — designed, not listed."],
            ["Enquiries & bookings", "Contact is the next action in the world, not a generic form."],
            ["Real-time analytics", "Encounters, saves, Paths, Hall visits — visitor identity stays private."],
            ["Real-world bridge", "An NFC tap in a gallery becomes a digital relationship."],
          ].map(([label, body]) => (
            <article
              key={label}
              style={{
                borderTop: "1px solid var(--presence-rule)",
                paddingTop: 14,
              }}
            >
              <p className="presence-eyebrow" style={{ margin: 0 }}>
                {label}
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: "var(--presence-on-paper-mute)",
                }}
              >
                {body}
              </p>
            </article>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <Link href="/presence-chooser" className="presence-btn">
            Build your Room <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Gardens */}
      <section
        className="presence-stack-section"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--garden-accent) 5%, transparent) 0%, transparent 100%)",
          marginTop: 32,
          maxWidth: "none",
          paddingLeft: "max(20px, calc((100vw - 1200px) / 2 + 20px))",
          paddingRight: "max(20px, calc((100vw - 1200px) / 2 + 20px))",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <span className="presence-stack-eyebrow">
            <span className="num">04</span> Gardens · social ecosystem
          </span>
          <h2 className="presence-stack-title">
            A Garden grows from
            <br />
            <em>where you&apos;ve been.</em>
          </h2>
          <p className="presence-stack-blurb">
            Observer Masks cultivate Gardens. Seeds arrive from Rooms you
            entered, Halls you joined, Mood Boards you tended, and people you
            crossed paths with. Nurture them, prune them, let them wilt or
            compost. Observations are what you noticed along the way.
          </p>
          <div
            style={{
              marginTop: 32,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            }}
          >
            {[
              ["Observer Masks", "Move through Gardens and Rooms without becoming a business profile."],
              ["Observations", "Text, finds, walks, mood — cultural fragments, not feed posts."],
              ["Seeds & nurture", "Active, watered, wilting, composted — a visible ecology."],
              ["Mood Boards → Seeds", "Pin a Room, plant it in your Garden. Maps of taste become Paths."],
              ["Echoes with attribution", "Carry an Observation into your own Garden, with credit."],
              ["Crossed Paths", "Rooms and Masks you brush past keep showing up."],
            ].map(([label, body]) => (
              <article
                key={label}
                style={{
                  borderTop: "1px solid var(--presence-rule)",
                  paddingTop: 14,
                }}
              >
                <p className="presence-eyebrow" style={{ margin: 0 }}>
                  {label}
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 14.5,
                    lineHeight: 1.5,
                    color: "var(--presence-on-paper-mute)",
                  }}
                >
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Halls */}
      <section className="presence-stack-section">
        <span className="presence-stack-eyebrow">
          <span className="num">05</span> Halls · gathering
        </span>
        <h2 className="presence-stack-title">
          Halls are where
          <br />
          your Room <em>opens its doors.</em>
        </h2>
        <p className="presence-stack-blurb">
          A Hall is a Town Square, a Salon, a Market with Stalls, a Listening
          Hall, a Studio open day, an Afterparty. Step into the Lobby. Listen
          on the Stage. Sit at a Table. Browse Stalls — each a Presence Room
          you can step into. Read the Noticeboard. Walk through a Portal to a
          related Room, Garden, or Hall.
        </p>
        <div
          style={{
            marginTop: 28,
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          }}
        >
          {[
            "Town Hall",
            "Market Hall",
            "Studio Hall",
            "Listening Hall",
            "Salon",
            "Guild Hall",
            "Afterparty",
            "Lobby",
          ].map((type) => (
            <div
              key={type}
              className="presence-card"
              style={{
                padding: 16,
                background: "var(--presence-bone)",
              }}
            >
              <p className="presence-eyebrow" style={{ margin: 0 }}>
                Hall type
              </p>
              <p
                className="presence-display"
                style={{
                  margin: "8px 0 0",
                  fontSize: 22,
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                }}
              >
                {type}
              </p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <Link href="/halls" className="presence-btn is-halls">
            Browse Halls <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Beta gallery teaser */}
      <section className="presence-stack-section">
        <span className="presence-stack-eyebrow">
          <span className="num">06</span> Beta gallery
        </span>
        <h2 className="presence-stack-title">
          The first Rooms,
          <br />
          <em>taking shape.</em>
        </h2>
        <p className="presence-stack-blurb">
          A curated walk through Presence Rooms under construction — artists,
          practitioners, venues, and organisations building their first
          cultural worlds. Step into a Room. See what is forming.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/gallery" className="presence-btn is-accent">
            Open the gallery <ArrowRight size={14} aria-hidden />
          </Link>
          <Link href="/design-lab" className="presence-btn is-ghost">
            <Sparkles size={14} aria-hidden /> Design lab · V2 previews
          </Link>
        </div>
      </section>

      {/* Final CTA — stage band */}
      <section
        style={{
          background: "var(--presence-stage)",
          color: "var(--presence-on-stage)",
          padding: "clamp(48px, 7vw, 96px) clamp(20px, 5vw, 56px)",
          borderTop: "1px solid var(--presence-rule-dark)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-30% -10% -10% -10%",
            background:
              "radial-gradient(ellipse at 30% 40%, color-mix(in oklab, var(--presence-vermilion) 30%, transparent), transparent 70%), radial-gradient(ellipse at 80% 80%, color-mix(in oklab, var(--presence-brass) 20%, transparent), transparent 70%)",
            filter: "blur(60px)",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
        <div
          style={{ position: "relative", maxWidth: 1200, margin: "0 auto" }}
        >
          <p
            className="presence-eyebrow on-stage"
            style={{ marginBottom: 14 }}
          >
            Begin
          </p>
          <h2
            className="presence-display"
            style={{
              fontSize: "clamp(40px, 6vw, 80px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.02,
              margin: 0,
              maxWidth: "16ch",
              textWrap: "balance",
              color: "var(--presence-on-stage)",
            }}
          >
            Open a Room. Tend a Garden.{" "}
            <em style={{ color: "var(--presence-brass)" }}>Hold a Hall.</em>
          </h2>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/presence-chooser"
              className="presence-btn on-stage"
              style={{ background: "var(--presence-brass)", color: "var(--presence-ink)", borderColor: "var(--presence-brass)" }}
            >
              Create your Room <ArrowRight size={14} aria-hidden />
            </Link>
            <Link
              href="/observer/garden"
              className="presence-btn on-stage is-ghost"
            >
              Join as Observer
            </Link>
            <Link
              href="/halls"
              className="presence-btn on-stage is-ghost"
            >
              Browse Halls
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "var(--presence-paper-2)",
          padding: "40px 24px",
          borderTop: "1px solid var(--presence-rule)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--presence-f-display)",
                fontSize: 22,
                letterSpacing: "-0.01em",
              }}
            >
              Presence
            </div>
            <p
              className="presence-eyebrow"
              style={{ marginTop: 10 }}
            >
              Not a profile · a place people can enter
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              fontSize: 13,
              color: "var(--presence-on-paper-mute)",
            }}
          >
            <Link href="/gallery" style={{ color: "inherit", textDecoration: "none" }}>Beta gallery</Link>
            <Link href="/halls" style={{ color: "inherit", textDecoration: "none" }}>Halls</Link>
            <Link href="/observer/garden" style={{ color: "inherit", textDecoration: "none" }}>Garden</Link>
            <Link href="/observer/passport" style={{ color: "inherit", textDecoration: "none" }}>Passport</Link>
            <Link href="/observer/mood-boards" style={{ color: "inherit", textDecoration: "none" }}>Mood Boards</Link>
            <Link href="/world" style={{ color: "inherit", textDecoration: "none" }}>World</Link>
            <Link href="/design-lab" style={{ color: "inherit", textDecoration: "none" }}>Design lab</Link>
            <Link href="/plans" style={{ color: "inherit", textDecoration: "none" }}>Plans</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
