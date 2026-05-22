// ============================================================================
// TEMPORARY DEMO PROFILE FIXTURES — NOT A PERMANENT DATA SOURCE.
// ============================================================================
//
// These are synthetic PresenceNode payloads for the six Presence DNA
// demo rooms. They exist for one reason: to let the public route render
// these rooms without requiring a backend seed/migration first.
//
// Resolution order in `fetchDemoOrPublicNode`:
//   1. Real backend response  (existing, unmodified)
//   2. Demo fixture           (this file)         ← removable
//
// Once the backend seeds these slugs as real PresenceNodes, this file
// becomes a dead branch and can be deleted with no other code changes.
//
// Image URLs use Unsplash (allowed in next.config.ts remotePatterns) so
// the demos look populated without bundling assets.
// ============================================================================

import type { PresenceNode, PresenceWork, PresenceService } from "@/lib/api/types";

const UNSPLASH = (id: string, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

function work(id: number, title: string, year: string, medium: string, imageId: string): PresenceWork {
  return {
    id,
    title,
    year,
    medium,
    image_url: UNSPLASH(imageId, 1600),
    thumbnail_url: UNSPLASH(imageId, 800),
    is_visible: true,
    sort_order: id,
  };
}

function service(id: number, title: string, description: string, price?: string | null, duration?: string | null): PresenceService {
  return { id, title, description, price_label: price ?? null, duration_label: duration ?? null, is_visible: true, sort_order: id };
}

const DEMOS: Record<string, PresenceNode> = {
  // -------------------------------------------------------------------------
  // 1. Underground DJ — Mira K.
  // -------------------------------------------------------------------------
  "rooms-underground-dj": {
    id: -1001,
    slug: "rooms-underground-dj",
    display_name: "Mira K.",
    headline: "Underground dj · Berlin / London circuit",
    bio: "Mira K. plays the long, slow-build sets that turn the room before sunrise.",
    short_bio: "DJ and selector. Berlin and London circuit. Bookings via this room only.",
    long_story:
      "Mira K. has been holding rooms since 2017. Resident at Floe (Berlin) 2021–2024, recurring sets at Pickle Factory (London), Berghain Säule, and Trauma Bar. Sets sit between club techno, dub, and broken weightless rhythms. Style notes: long sets only (90 minutes+), no openers, no warm-ups — every set is the room's centre of gravity.",
    node_type: "creative",
    display_mode: "minimal_portal",
    status: "published",
    visibility: "public",
    room_type: "performer_music",
    theme_preset: "neon_night",
    accent_color: "#ffd84d",
    hero_title: "Mira K.",
    hero_subtitle: "Selector, resident, long-form set holder.",
    hero_image_url: UNSPLASH("photo-1493676304819-0d7a8d026dcf", 1800),
    location_label: "Berlin / London",
    availability_status: "Booking Q4 + winter residency",
    primary_cta_label: "Book the room",
    primary_cta_url: null,
    public_email: "bookings@mirak.fm",
    public_phone: null,
    media_embeds: [
      { label: "Latest set — Trauma Bar", url: "https://soundcloud.com/example/trauma-bar-set", provider: "SoundCloud", type: "audio" },
      { label: "Live at Floe — 2024", url: "https://soundcloud.com/example/floe-2024", provider: "SoundCloud", type: "audio" },
    ],
    works: [
      work(1, "Säule — 02:40", "2024", "live set", "photo-1571266028243-d220c6a3eecf"),
      work(2, "Floe Resident — Winter 23/24", "2024", "residency", "photo-1574391884720-bbc049ec09ad"),
      work(3, "Pickle Factory — closing set", "2023", "live set", "photo-1493676304819-0d7a8d026dcf"),
      work(4, "Trauma Bar — fluid weightless", "2024", "live set", "photo-1571266028243-d220c6a3eecf"),
      work(5, "Berghain Säule — second visit", "2024", "live set", "photo-1517457373958-b7bdd4587205"),
      work(6, "Dekmantel — outdoor stage", "2023", "festival set", "photo-1429962714451-bb934ecdc4ec"),
    ],
    links: [
      { id: 1, label: "Latest mix on SoundCloud", url: "https://soundcloud.com/example", is_visible: true },
      { id: 2, label: "Instagram", url: "https://instagram.com/example", is_visible: true },
      { id: 3, label: "Press kit", url: "https://example.com/press", is_visible: true },
    ],
    services: [],
    collections: [],
    proof_items: [],
    credentials: [],
  } as unknown as PresenceNode,

  // -------------------------------------------------------------------------
  // 2. Gallery painter — Naoko Sato
  // -------------------------------------------------------------------------
  "rooms-gallery-painter": {
    id: -1002,
    slug: "rooms-gallery-painter",
    display_name: "Naoko Sato",
    headline: "Painter · Commissioned and selected works",
    bio: "Paintings made slowly, on linen, with washes laid down over weeks.",
    short_bio: "Painter, working in oil and watercolour washes on linen. Commissioned and selected works.",
    long_story:
      "I work slowly. A painting is a record of a room — the light it sat in, the weeks it watched. Commissions begin with a long visit, sometimes several. The work is made after, in the studio, over months. Recent commissions for private collections in Tokyo, Sydney, and Lisbon; selected work held in the Yamamoto Collection.",
    practice_statement:
      "Oil washes on raw linen. Each painting is built from many translucent layers, each laid down and allowed to settle before the next. I do not finish quickly. I do not finish many.",
    node_type: "artist",
    display_mode: "artist_gallery",
    status: "published",
    visibility: "public",
    room_type: "artist_studio",
    theme_preset: "gallery_white",
    accent_color: "#1a1a17",
    hero_title: "Naoko Sato",
    hero_subtitle: "Paintings, commissions, and a small body of selected work.",
    hero_image_url: UNSPLASH("photo-1547891654-e66ed7ebb968", 1800),
    location_label: "Lisbon · Studio Pinha",
    availability_status: "Accepting one commission for 2026",
    primary_cta_label: "Commission a work",
    primary_cta_url: null,
    public_email: "studio@naokosato.work",
    public_phone: null,
    media_embeds: [],
    works: [
      work(10, "Asagao", "2024", "oil on linen, 160 × 110 cm", "photo-1547891654-e66ed7ebb968"),
      work(11, "Hane I", "2024", "oil on linen, 80 × 60 cm", "photo-1578926375605-eaf7559b1458"),
      work(12, "Yūbe", "2023", "watercolour on cotton, 60 × 45 cm", "photo-1579783902614-a3fb3927b6a5"),
      work(13, "Tsubasa", "2023", "oil on linen, 200 × 140 cm", "photo-1579202673506-ca3ce28943ef"),
      work(14, "Ame", "2022", "watercolour, 35 × 28 cm", "photo-1578320340437-7a3a4c1d6f4f"),
      work(15, "Hane II", "2024", "oil on linen, 80 × 60 cm", "photo-1582555172866-f73bb12a2ab3"),
    ],
    services: [
      service(20, "Private commission", "A painting made over six to nine months, after a long visit to the room it will live in. One commission per year.", "On enquiry", "6–9 months"),
      service(21, "Selected works", "Existing works available through the studio. Limited edition watercolours released in spring.", "From €4,800", null),
    ],
    proof_items: [
      { id: 30, title: null, client_label: "Yamamoto Collection", testimonial: "Naoko's paintings hold a room without ever asking for attention. They are the room.", outcome: "Private collection, Tokyo" },
      { id: 31, title: null, client_label: "T. Almeida", testimonial: "We waited nine months. The wait is part of the work.", outcome: "Commission, Lisbon" },
    ],
    credentials: [],
    links: [
      { id: 40, label: "Studio Pinha", url: "https://example.com/studio-pinha", is_visible: true },
      { id: 41, label: "Press archive", url: "https://example.com/press", is_visible: true },
    ],
    collections: [],
  } as unknown as PresenceNode,

  // -------------------------------------------------------------------------
  // 3. Material carpenter — Salt & Grain Studio
  // -------------------------------------------------------------------------
  "rooms-material-carpenter": {
    id: -1003,
    slug: "rooms-material-carpenter",
    display_name: "Salt & Grain Studio",
    headline: "Furniture in salvaged hardwoods · One-piece-at-a-time workshop",
    bio: "A two-person workshop making one chair, one table, one cabinet at a time.",
    short_bio: "Two-person furniture workshop. Salvaged Australian hardwoods, traditional joinery, slow finishes.",
    long_story:
      "Salt & Grain is a two-person workshop on the south coast of New South Wales. We make commissioned furniture in salvaged Australian hardwoods — spotted gum, blackbutt, ironbark, jarrah. We use traditional joinery (mortise and tenon, dovetail, draw-bored frames) and finish with hand-rubbed oils. No factory finishes, no spray booths, no veneer.",
    practice_statement:
      "Each piece begins with a board. We choose the board, the joinery, and the finish for the room the piece will live in. A dining table takes four to six months from first conversation to delivery.",
    node_type: "tradie",
    display_mode: "studio_practice",
    status: "published",
    visibility: "public",
    room_type: "artist_studio",
    theme_preset: "warm_earth",
    accent_color: "#e0a455",
    hero_title: "Salt & Grain",
    hero_subtitle: "Furniture made one piece at a time in salvaged Australian hardwoods.",
    hero_image_url: UNSPLASH("photo-1503602642458-232111445657", 1800),
    location_label: "Milton, NSW",
    availability_status: "Books open for autumn 2026 commissions",
    primary_cta_label: "Begin a commission",
    primary_cta_url: null,
    public_email: "studio@saltandgrain.au",
    public_phone: null,
    media_embeds: [],
    works: [
      work(50, "Long table for Mongarlowe", "2024", "Spotted gum, hand-rubbed oil, 2.8m × 0.95m", "photo-1503602642458-232111445657"),
      work(51, "Six-board cabinet", "2024", "Blackbutt, draw-bored mortise and tenon", "photo-1493663284031-b7e3aefcae8e"),
      work(52, "Library chair", "2023", "Ironbark, mortise and tenon, leather seat", "photo-1567538096630-e0c55bd6374c"),
      work(53, "Studio bench", "2024", "Jarrah, salvaged from Hobart slipway", "photo-1538688525198-9b88f6f53126"),
      work(54, "Reading shelf", "2023", "Spotted gum, fixed shelves, mitred joinery", "photo-1505691938895-1758d7feb511"),
      work(55, "Side table — pair", "2024", "Blackbutt, tapered legs", "photo-1567538096631-e0c55bd6374c"),
    ],
    services: [
      service(60, "First conversation", "We meet at the studio or at the room the piece will live in. We talk about how the room is used, the light it gets, and what the piece needs to do.", null, "1–2 visits"),
      service(61, "Board selection and design", "We choose the boards together. You sign off a working drawing. A 30% deposit secures the boards and the workshop time.", "30% deposit", "1 month"),
      service(62, "Making", "The work happens in the workshop. We send photographs every two weeks. You are welcome to visit.", null, "3–5 months"),
      service(63, "Delivery and oiling", "We deliver, install, and oil the piece in place. You can return it within two years for a re-oil at no charge.", "Included", "1 day"),
    ],
    proof_items: [
      { id: 70, title: null, client_label: "M. & D. Lawler, Mongarlowe", testimonial: "We waited five months and it was the best part. The table arrived already feeling old.", outcome: "Long table commission, 2024" },
      { id: 71, title: null, client_label: "S. Park, Bowral", testimonial: "Salt & Grain treat the board like it's already part of the house. That care is in the finished piece.", outcome: "Cabinet commission, 2024" },
    ],
    credentials: [],
    links: [],
    collections: [],
  } as unknown as PresenceNode,

  // -------------------------------------------------------------------------
  // 4. Local carpenter — Dave Carpentry (deliberately NOT the same as #3)
  // -------------------------------------------------------------------------
  "rooms-local-carpenter": {
    id: -1004,
    slug: "rooms-local-carpenter",
    display_name: "Dave Carpentry — Bega Valley",
    headline: "Local carpentry, decks, renovations · Quotes within 24 hours",
    bio: "Local carpenter serving the Bega Valley. Decks, pergolas, repairs, renovations. Fully licensed and insured.",
    short_bio: "Local Bega Valley carpenter. Decks, repairs, renovations, pergolas. Quotes within 24 hours.",
    node_type: "tradie",
    display_mode: "tradie_profile",
    status: "published",
    visibility: "public",
    room_type: "minimal_card",
    theme_preset: "warm_earth",
    accent_color: "#a14215",
    hero_title: "Quotes within 24 hours.",
    hero_subtitle: "Local carpenter, Bega Valley. Decks, pergolas, repairs, small renovations.",
    hero_image_url: UNSPLASH("photo-1503387762-592deb58ef4e", 1800),
    location_label: "Bega Valley, NSW",
    availability_status: "Available now · booking for next month",
    primary_cta_label: "Get a quote",
    primary_cta_url: null,
    public_email: "dave@davecarpentry.au",
    public_phone: "0455 100 200",
    media_embeds: [],
    // Works are paired Before/After for the slider signature.
    works: [
      work(80, "Before: Tathra deck", "2024", "rebuild", "photo-1605276374104-dee2a0ed3cd6"),
      work(81, "After: Tathra deck", "2024", "rebuild", "photo-1591389703635-e15a07b842d7"),
      work(82, "Before: Bermagui pergola", "2024", "build", "photo-1567016432779-094069958ea5"),
      work(83, "After: Bermagui pergola", "2024", "build", "photo-1599809275671-b5942cabc7a2"),
      work(84, "Before: Candelo kitchen reno", "2023", "renovation", "photo-1556909114-f6e7ad7d3136"),
      work(85, "After: Candelo kitchen reno", "2023", "renovation", "photo-1565182999561-18d7dc61c393"),
    ],
    services: [
      service(90, "Decks and pergolas", "Build, rebuild, repair. Hardwood and treated pine. All licensed structural work.", "From $4,500", "2–3 weeks"),
      service(91, "Small renovations", "Kitchen, bathroom, laundry. Two-tradie crew, owner-builder friendly.", "Quote on site", "3–6 weeks"),
      service(92, "Repairs and odd jobs", "Doors, windows, floorboards, storm repair. Booked weekly.", "From $180", "Same week"),
      service(93, "Insurance and storm work", "Insurance-approved storm and water damage repair. Direct billing available.", "Insurer billed", "Priority"),
    ],
    proof_items: [
      { id: 100, title: null, client_label: "J. Walker, Tathra", testimonial: "Dave came out the day I rang. Quote the next morning. Deck done in a week. Honest pricing.", outcome: "Deck rebuild, 2024" },
      { id: 101, title: null, client_label: "K. Reilly, Bermagui", testimonial: "Showed up when he said. Cleaned up after every day. We've had him back for two more jobs since.", outcome: "Pergola build, 2024" },
      { id: 102, title: null, client_label: "M. & T. Hughes, Candelo", testimonial: "After the storms we got three quotes. Dave was the only one who answered. Job done in eighteen days.", outcome: "Kitchen renovation, 2023" },
    ],
    credentials: [
      { id: 110, title: "NSW Building Licence #284551", issuer: "NSW Fair Trading", credential_type: "Licence", is_public: true },
      { id: 111, title: "$20m Public Liability", issuer: "Allianz", credential_type: "Insurance", is_public: true },
    ],
    links: [],
    collections: [],
  } as unknown as PresenceNode,

  // -------------------------------------------------------------------------
  // 5. Community healer — Mara Lin
  // -------------------------------------------------------------------------
  "rooms-community-healer": {
    id: -1005,
    slug: "rooms-community-healer",
    display_name: "Mara Lin",
    headline: "Somatic practitioner · Inner-west community",
    bio: "Somatic practitioner working with individuals, small circles, and seasonal programmes.",
    short_bio: "Somatic practitioner. Individuals, small circles, seasonal programmes. Inner-west community.",
    long_story:
      "I work somatically, with care for nervous-system regulation, trauma-informed practice, and the slow weather of seasonal change. Practice held in a quiet room above the bakery in Newtown, and in small outdoor circles in Camperdown Park.",
    practice_statement:
      "The work is somatic and slow. I am trained in Hakomi, Embodied Recovery for Survivors of Sexual Abuse, and trauma-informed yoga. I work within scope and refer where appropriate.",
    node_type: "practitioner",
    display_mode: "practitioner_profile",
    status: "published",
    visibility: "public",
    room_type: "practitioner",
    theme_preset: "soft_healing",
    accent_color: "#527a52",
    hero_title: "Mara Lin",
    hero_subtitle: "Somatic practice for individuals and small circles.",
    hero_image_url: UNSPLASH("photo-1518609878373-06d740f60d8b", 1800),
    location_label: "Newtown, Sydney",
    availability_status: "Wait-list open for autumn circles",
    primary_cta_label: "Begin a conversation",
    primary_cta_url: null,
    public_email: "hello@maralin.care",
    public_phone: null,
    media_embeds: [],
    works: [],
    services: [
      service(120, "1:1 sessions", "Held weekly or fortnightly. Sliding scale available; please ask.", "Sliding $80–$160", "60 min"),
      service(121, "Small circles", "Four to six people, held over six weeks. Bring your own bolster.", "$320 / 6 weeks", "6 weeks"),
      service(122, "Seasonal programme", "Autumn and spring. Three Sundays, an outdoor circle, and a written practice you take home.", "$420", "3 Sundays"),
    ],
    proof_items: [
      { id: 130, title: null, client_label: "A. (Inner-west circle)", testimonial: "I joined the autumn circle without knowing what I needed. I left with a steadier nervous system and a community.", outcome: "Autumn circle, 2024" },
      { id: 131, title: null, client_label: "R. (1:1)", testimonial: "Mara holds the work without rushing it. The slow pace is the point.", outcome: "1:1, ongoing" },
    ],
    credentials: [
      { id: 140, title: "Hakomi Comprehensive Training", issuer: "Hakomi Institute", credential_type: "Certification", is_public: true },
      { id: 141, title: "ERSSA — Embodied Recovery for Survivors of Sexual Abuse", issuer: "ERSSA", credential_type: "Certification", is_public: true },
    ],
    links: [],
    collections: [],
  } as unknown as PresenceNode,

  // -------------------------------------------------------------------------
  // 6. Sharp consultant — Heron Strategy (Hye-Jin Park)
  // -------------------------------------------------------------------------
  "rooms-sharp-consultant": {
    id: -1006,
    slug: "rooms-sharp-consultant",
    display_name: "Heron Strategy",
    headline: "Independent advisory for product-led companies entering Europe",
    bio: "Independent advisory practice. Three to five engagements a year, exclusively for product-led companies entering the European market.",
    short_bio: "Independent advisory for product-led companies entering Europe. Three to five engagements a year.",
    long_story:
      "Heron Strategy is the independent advisory practice of Hye-Jin Park. Previously: VP Strategy at Notion (2019–2022), strategy lead at Linear (2017–2019), and a stint in residence at Index Ventures (2022–2024). Heron works exclusively with product-led companies preparing to enter, or already operating in, the European market.",
    practice_statement:
      "Engagements are scoped tightly: six to twelve weeks, one principal, no junior team, no slide deliverables. Output is one written memo, one decision, and one set of week-by-week measures.",
    node_type: "consultant",
    display_mode: "professional_contract",
    status: "published",
    visibility: "public",
    room_type: "minimal_card",
    theme_preset: "minimal_mono",
    accent_color: "#0d0d0d",
    hero_title: "Independent advisory for product-led companies entering Europe.",
    hero_subtitle: "Three to five engagements a year. Booked one quarter ahead.",
    hero_image_url: UNSPLASH("photo-1556761175-5973dc0f32e7", 1800),
    location_label: "Amsterdam · Berlin · London",
    availability_status: "Two engagements open for Q1 2026",
    primary_cta_label: "Open a project conversation",
    primary_cta_url: null,
    public_email: "office@heronstrategy.eu",
    public_phone: null,
    media_embeds: [],
    works: [],
    services: [
      service(150, "Market-entry engagement", "Six to twelve weeks, one principal. Output: one written memo, one decision, one set of week-by-week measures.", "From €38,000", "6–12 weeks"),
      service(151, "Quarterly board contribution", "Four meetings, one written briefing per quarter. Sized for companies that don't need a full board chair.", "€18,000 / quarter", "Quarterly"),
      service(152, "Acquisition prep (Europe-side)", "Targeted six-week preparation when the acquirer is European. Includes IC narrative and one-on-one prep.", "€42,000 fixed", "6 weeks"),
    ],
    proof_items: [
      { id: 160, title: null, client_label: "CEO, late-stage SaaS (anonymous)", testimonial: "One memo, one decision. We saved a quarter and an unprofitable hire.", outcome: "Market entry, 2024" },
      { id: 161, title: null, client_label: "Founder, fintech, 80 staff", testimonial: "Heron is the only advisor we've worked with who refuses to expand scope. It's the reason the work lands.", outcome: "Quarterly board contribution, 2023–2024" },
      { id: 162, title: null, client_label: "Board chair, growth-stage marketplace", testimonial: "Hye-Jin's memo was the document the board referenced for the next twelve months.", outcome: "Acquisition prep, 2024" },
    ],
    credentials: [],
    links: [
      { id: 170, label: "Selected writing", url: "https://heronstrategy.eu/writing", is_visible: true },
    ],
    collections: [],
  } as unknown as PresenceNode,

  // -------------------------------------------------------------------------
  // GGM first-pilot — Christina Kerkvliet Goddard
  //
  // This demo entry only fires when the backend has not yet seeded the GGM
  // pilot Room. It carries the `ggm-faithful-room-v1` renderer key so the
  // frontend PresenceDnaRenderer dispatches to the GGM faithful surface
  // (see lib/presence/ggm/activate.ts).
  //
  // Note: the asset URLs all live under /public/ggm so this entry never
  // depends on a network-hosted asset host.
  // -------------------------------------------------------------------------
  "ggm": {
    id: -1100,
    slug: "ggm",
    display_name: "Christina Kerkvliet Goddard",
    headline: "Christina Kerkvliet Goddard · selected watercolour works",
    bio: "Born in Victoria and raised in South Australia, Christina grew up around the active art scene of the 1960s and 70s. Her practice moves between drawing, craft, painting, and installation while staying rooted in close observation of daily life.",
    short_bio: "Australian artist working across memory, colour, and lived landscape.",
    long_story:
      "Her work explores convergences, chance encounters, and life-cycles — ways in which memory appears briefly through colour, place, and material. The Memory Colours body of work brings these concerns into visual form through layered line, atmosphere, and emotional resonance.",
    node_type: "creative",
    display_mode: "artist_gallery",
    status: "published",
    visibility: "public",
    room_type: "artist_studio",
    accent_color: "#111111",
    hero_title: "Colour as Memory",
    hero_subtitle: "Selected watercolour works",
    hero_image_url: "/ggm/works/willow-of-port-arthur-2019.webp",
    cover_image_url: "/ggm/works/willow-of-port-arthur-2019.webp",
    profile_image_url: "/ggm/portrait/christina-kerkvliet-goddard-portrait.webp",
    location_label: "Moana, South Australia",
    practice_statement:
      "Memory Colours revisits and haunts its sites of episode as a way to present how colour can generate memory.",
    public_email: "christina.8@bigpond.com",
    primary_cta_label: "Begin a conversation",
    primary_cta_url: null,
    works: [
      work(1101, "Bridle Road", "2005", "Watercolour on paper", "ggm-bridle"),
      work(1102, "Thomas Road", "2007", "Watercolour on paper", "ggm-thomas"),
      work(1103, "Goodnight Kiss", "2007", "Watercolour on paper", "ggm-goodnight"),
      work(1104, "Gothic Tapestry", "2008", "Watercolour on paper", "ggm-gothic"),
      work(1105, "Burgundy Peaches", "2008", "Watercolour on paper", "ggm-burgundy"),
      work(1106, "Last Dash", "2009", "Watercolour on paper", "ggm-last-dash"),
      work(1107, "Empty Nest", "2014", "Watercolour on paper", "ggm-empty-nest"),
      work(1108, "Willow of Port Arthur", "2019", "Watercolour on paper", "ggm-willow"),
    ].map((w, i) => {
      const slugs = [
        "bridle-road-2005",
        "thomas-road-2007",
        "goodnight-kiss-2007",
        "gothic-tapestry-2008",
        "burgundy-peaches-2008",
        "last-dash-2009",
        "empty-nest-2014",
        "willow-of-port-arthur-2019",
      ];
      return {
        ...w,
        image_url: `/ggm/works/${slugs[i]}.webp`,
        thumbnail_url: `/ggm/thumbs/${slugs[i]}.webp`,
      };
    }),
    links: [
      {
        id: 1110,
        label: "Source portfolio (Vercel mock-up)",
        url: "https://christina-goddard.vercel.app/",
        is_visible: true,
      },
      {
        id: 1111,
        label: "Art Scene Today profile",
        url: "http://artscenetoday.com/juried-exhibitions/coloring_outside_the_lines/christina_kerkvliet_goddard/",
        is_visible: true,
      },
    ],
    services: [],
    collections: [],
    proof_items: [],
    credentials: [],
    metadata: {
      custom_presence: {
        style_dna: {
          renderer_key: "ggm-faithful-room-v1",
        },
      },
    },
  } as unknown as PresenceNode,
};

export function demoProfileForSlug(slug: string | null | undefined): PresenceNode | null {
  if (!slug) return null;
  const profile = DEMOS[slug];
  if (!profile) return null;
  // Return a stable shallow clone so downstream code can attach computed
  // fields without poisoning the registry.
  return { ...profile };
}

export function demoProfileSlugs(): string[] {
  return Object.keys(DEMOS);
}
