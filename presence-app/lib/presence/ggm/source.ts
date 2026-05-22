// GGM canonical source content.
//
// Mirrors the local source at C:\Dev\ggm (data/artist.json and data/works.json)
// and the asset hierarchy that lives in /public/ggm.
//
// This module exists so the GGM faithful renderer can ALWAYS produce the
// source-correct first impression, even when the backend has not yet been
// seeded with the full source work inventory, the inspire-board content,
// or the working-path timeline. When the backend supplies its own works,
// statements, or links, the renderer prefers those values and uses this
// module only as a fallback for gaps.
//
// Do not export operator-only paths (e.g. C:\Dev\ggm) from this file. The
// public response must never contain a local source path.

export interface GgmWork {
  id: string;
  slug: string;
  title: string;
  year: number;
  medium: string;
  dimensions: string;
  image: string;
  thumb: string;
  alt: string;
  description: string;
  context: string;
  process: string;
  memory: string;
  moodTags: string[];
}

export interface GgmArtist {
  name: string;
  subtitle: string;
  location: string;
  contactEmail: string;
  contactWebsite: string;
  heroTitle: string;
  heroCaption: string;
  aboutIntro: string;
  aboutBody: string;
  statementQuote: string;
  influences: string[];
  timeline: Array<{ when: string; what: string }>;
  referenceUrl: string;
}

export const GGM_ARTIST: GgmArtist = {
  name: "Christina Kerkvliet Goddard",
  subtitle:
    "Australian artist working across memory, colour, and lived landscape",
  location: "Moana, South Australia",
  contactEmail: "christina.8@bigpond.com",
  contactWebsite: "http://www.ckgoddard.com.au/",
  heroTitle: "Colour as Memory",
  heroCaption: "Christina Kerkvliet Goddard · selected watercolour works",
  aboutIntro:
    "Born in Victoria and raised in South Australia, Christina grew up around the active art scene of the 1960s and 70s. Her practice moves between drawing, craft, painting, and installation while staying rooted in close observation of daily life.",
  aboutBody:
    "Her work explores convergences, chance encounters, and life-cycles — ways in which memory appears briefly through colour, place, and material. The Memory Colours body of work brings these concerns into visual form through layered line, atmosphere, and emotional resonance.",
  statementQuote:
    "Memory Colours revisits and haunts its sites of episode as a way to present how colour can generate memory.",
  influences: [
    "Mona Hatoum",
    "David Hammons",
    "Louise Bourgeois",
    "Rebecca Horn",
    "Claudia-Marie Leunig",
  ],
  timeline: [
    { when: "Early years", what: "Drawing, craft instincts, and formative immersion in South Australian visual culture." },
    { when: "Formal study", what: "Certificate of Art, followed by BA of Visual Arts (UniSA)." },
    { when: "Practice period", what: "Community contribution, commissions, and experimental exhibitions across mainstream and outside spaces." },
    { when: "2009", what: "Accepted into RMIT's Master of Fine Art program in Melbourne." },
    { when: "2011", what: "Art Scene Today Spring competition — 3rd Place Winner." },
  ],
  referenceUrl:
    "http://artscenetoday.com/juried-exhibitions/coloring_outside_the_lines/christina_kerkvliet_goddard/",
};

const W = (slug: string) => `/ggm/works/${slug}.webp`;
const T = (slug: string) => `/ggm/thumbs/${slug}.webp`;

export const GGM_WORKS: GgmWork[] = [
  {
    id: "bridle-road-2005",
    slug: "bridle-road-2005",
    title: "Bridle Road",
    year: 2005,
    medium: "Watercolour on paper",
    dimensions: "41 x 61 cm",
    image: W("bridle-road-2005"),
    thumb: T("bridle-road-2005"),
    alt: "Bridle Road, 2005. Watercolour on paper.",
    description:
      "A branching roadway rendered through entwined linework and earthy colour, where movement and memory fold into one another.",
    context:
      "Bridle Road belongs to Christina's early-2000s investigations into how roads function as emotional conduits rather than simple landscape features.",
    process:
      "Built through repeated translucent washes and dark linear overlays, the painting balances immediacy with structured mark-memory.",
    memory:
      "The work stages movement through place as a recollection in-progress, where depth is assembled through accumulated traces.",
    moodTags: ["pathway", "earth", "transition", "woodland"],
  },
  {
    id: "thomas-road-2007",
    slug: "thomas-road-2007",
    title: "Thomas Road",
    year: 2007,
    medium: "Watercolour on paper",
    dimensions: "Unknown",
    image: W("thomas-road-2007"),
    thumb: T("thomas-road-2007"),
    alt: "Thomas Road, 2007. Watercolour on paper.",
    description:
      "A night-framed road scene balancing dark silhouettes with luminous distance, evoking transition and uncertainty.",
    context:
      "This work sits within a nocturnal sequence where architecture and horizon emerge from deep tonal fields.",
    process:
      "The composition uses compressed contrasts to hold moonlight against near-black silhouettes, allowing atmosphere to drive form.",
    memory:
      "Thomas Road reads like a remembered threshold: familiar yet unstable, intimate yet distant.",
    moodTags: ["nocturne", "threshold", "silhouette", "quiet"],
  },
  {
    id: "goodnight-kiss-2007",
    slug: "goodnight-kiss-2007",
    title: "Goodnight Kiss",
    year: 2007,
    medium: "Watercolour on paper",
    dimensions: "Unknown",
    image: W("goodnight-kiss-2007"),
    thumb: T("goodnight-kiss-2007"),
    alt: "Goodnight Kiss, 2007. Watercolour on paper.",
    description:
      "A compact nocturne with still water and dark tree masses, conveying intimacy through tonal restraint.",
    context:
      "Goodnight Kiss extends Christina's interest in end-of-day transitions and suspended stillness.",
    process:
      "Thin layered staining and contour reinforcement create a restrained chromatic field with subtle spatial drift.",
    memory:
      "The scene evokes the private emotional register of evening departures and returns.",
    moodTags: ["twilight", "stillness", "water", "intimate"],
  },
  {
    id: "gothic-tapestry-2008",
    slug: "gothic-tapestry-2008",
    title: "Gothic Tapestry",
    year: 2008,
    medium: "Watercolour on paper",
    dimensions: "81 x 131 cm",
    image: W("gothic-tapestry-2008"),
    thumb: T("gothic-tapestry-2008"),
    alt: "Gothic Tapestry, 2008. Watercolour on paper.",
    description:
      "A densely woven forest composition where pathways and branches interlace like textile memory.",
    context:
      "Part of a dense woodland body of work, Gothic Tapestry treats landscape as an interwoven fabric of routes and relations.",
    process:
      "Interlaced line networks are built over pooled watercolour passages, producing a woven visual rhythm.",
    memory:
      "The image functions as a mnemonic map where pathways are both physical and psychological.",
    moodTags: ["woodland", "woven", "density", "route"],
  },
  {
    id: "burgundy-peaches-2008",
    slug: "burgundy-peaches-2008",
    title: "Burgundy Peaches",
    year: 2008,
    medium: "Watercolour on paper",
    dimensions: "81 x 131 cm",
    image: W("burgundy-peaches-2008"),
    thumb: T("burgundy-peaches-2008"),
    alt: "Burgundy Peaches, 2008. Watercolour on paper.",
    description:
      "A saturated still-life where fruit and vessel are shaped through expressive contour and richly stained colour.",
    context:
      "This still-life shifts Christina's memory inquiry into domestic material culture and table-top ritual.",
    process:
      "Warm pigments are concentrated in fruit forms while cooler grounds stabilize spatial flow and edge vibration.",
    memory:
      "The painting activates memory through touch-like colour: weight, ripeness, vessel, and surface.",
    moodTags: ["domestic", "still-life", "warmth", "table"],
  },
  {
    id: "last-dash-2009",
    slug: "last-dash-2009",
    title: "Last Dash",
    year: 2009,
    medium: "Watercolour on paper",
    dimensions: "49 x 39 cm",
    image: W("last-dash-2009"),
    thumb: T("last-dash-2009"),
    alt: "Last Dash, 2009. Watercolour on paper.",
    description:
      "A vertical woodland rush that compresses depth and motion into a charged, fleeting encounter.",
    context:
      "Last Dash marks a vertical intensification of the forest motif, emphasizing urgency and directional force.",
    process:
      "Tight overdrawn line and compressed perspective channel the eye forward with little visual pause.",
    memory:
      "The work captures a fleeting instant — an embodied rush before an image settles into recollection.",
    moodTags: ["urgency", "vertical", "forest", "motion"],
  },
  {
    id: "empty-nest-2014",
    slug: "empty-nest-2014",
    title: "Empty Nest",
    year: 2014,
    medium: "Watercolour on paper",
    dimensions: "88 x 105 cm",
    image: W("empty-nest-2014"),
    thumb: T("empty-nest-2014"),
    alt: "Empty Nest, 2014. Watercolour on paper.",
    description:
      "A tensile branch structure centered on a nest form, addressing absence, care, and generational cycles.",
    context:
      "Empty Nest engages life-cycle symbolism directly, positioning the nest as both absence and archive.",
    process:
      "Branch structures are layered to create tensile spatial scaffolding around a central nest form.",
    memory:
      "The painting reflects on generational transition and the emotional architecture of care.",
    moodTags: ["nest", "cycle", "care", "absence"],
  },
  {
    id: "willow-of-port-arthur-2019",
    slug: "willow-of-port-arthur-2019",
    title: "Willow of Port Arthur",
    year: 2019,
    medium: "Watercolour on paper",
    dimensions: "93 x 104 cm",
    image: W("willow-of-port-arthur-2019"),
    thumb: T("willow-of-port-arthur-2019"),
    alt: "Willow of Port Arthur, 2019. Watercolour on paper.",
    description:
      "A luminous green canopy where atmosphere and recollection merge into a soft, suspended scene.",
    context:
      "A later luminous work, Willow of Port Arthur opens Christina's line language into softer atmospheric diffusion.",
    process:
      "Wet-in-wet passages and transparent glazes produce suspended greens and softened depth transitions.",
    memory:
      "Here memory appears as atmosphere itself — diffused, enveloping, and quietly persistent.",
    moodTags: ["canopy", "luminous", "atmospheric", "memory"],
  },
];

// Hero sequence ordered exactly like the source slideshow.
export const GGM_HERO_SEQUENCE: GgmWork[] = [
  "willow-of-port-arthur-2019",
  "bridle-road-2005",
  "thomas-road-2007",
  "gothic-tapestry-2008",
  "empty-nest-2014",
].map((slug) => GGM_WORKS.find((w) => w.slug === slug)!).filter(Boolean);

// Featured strip (matches source home page).
export const GGM_FEATURED: GgmWork[] = [
  "bridle-road-2005",
  "gothic-tapestry-2008",
  "empty-nest-2014",
  "willow-of-port-arthur-2019",
].map((slug) => GGM_WORKS.find((w) => w.slug === slug)!).filter(Boolean);

// Inspiration board captions (matches source about page).
export interface InspireCard {
  pin: "a" | "b" | "c" | "d" | "e" | "f";
  caption: string;
  image: string;
  variant: "tall" | "wide" | "mid" | "poster" | "portrait";
}

export const GGM_INSPIRE: InspireCard[] = [
  { pin: "a", caption: "roadside trees after rain", image: W("bridle-road-2005"), variant: "tall" },
  { pin: "b", caption: "chance encounters in nature", image: W("thomas-road-2007"), variant: "wide" },
  { pin: "c", caption: "nests and branch architecture", image: W("gothic-tapestry-2008"), variant: "mid" },
  { pin: "d", caption: "my grandmothers' gestures", image: W("empty-nest-2014"), variant: "poster" },
  { pin: "e", caption: "drawn maps of place", image: W("willow-of-port-arthur-2019"), variant: "portrait" },
  { pin: "f", caption: "line as flight and return", image: W("thomas-road-2007"), variant: "wide" },
];

// Working concerns (4 strand cards).
export const GGM_STRANDS = [
  { title: "Memory colours", body: "Colour as a trigger for recollection, emotional episode, and narrative permeability." },
  { title: "Life-cycles", body: "Nest, branch, path, and seasonal shifts as recurring forms of generational relation." },
  { title: "Outsider position", body: "A practice that values independent inquiry and cross-disciplinary material language." },
  { title: "Nature episodes", body: "Brief encounters in the everyday natural environment translated into layered mark-fields." },
];

export function ggmYears(): number[] {
  return Array.from(new Set(GGM_WORKS.map((w) => w.year))).sort((a, b) => a - b);
}

export function ggmWorkBySlug(slug: string): GgmWork | undefined {
  return GGM_WORKS.find((w) => w.slug === slug);
}

export const GGM_PORTRAIT = "/ggm/portrait/christina-kerkvliet-goddard-portrait.webp";

// External live-demo URL for the "Reference profile" link in the GGM
// renderer. This is the curator-approved public source of truth.
export const GGM_LIVE_DEMO_URL = "https://christina-goddard.vercel.app/";
