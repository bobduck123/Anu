import {
  createElement,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import type { Room } from "../../lib/presence/studio-room/model.ts";
import { toPublicRoomPayload } from "../../lib/presence/studio-room/sanitize.ts";
import {
  renderStudioRoom,
  type RenderedChamber,
  type RenderedRoomObject,
  type StudioRoomViewport,
} from "../../lib/presence/studio-room/renderer.ts";

export interface StudioRoomRendererProps {
  room: Room;
  viewport?: StudioRoomViewport;
  canvas?: boolean;
  selectedObjectId?: string | null;
  selectionMode?: "ring" | "spotlight";
  reducedMotion?: boolean;
  onSelectObject?: (objectId: string) => void;
}

const KIT_RENDERER_TOKENS: Record<string, {
  glow: string;
  mesh: [string, string, string];
  radiusPx: number;
  headingWeight: number;
  ctaStyle: "solid" | "outline";
}> = {
  "gallery-artist": {
    glow: "#b78c4e",
    mesh: ["#e6d4ad", "#f3e8cf", "#d8c39a"],
    radiusPx: 16,
    headingWeight: 500,
    ctaStyle: "outline",
  },
  "cultural-community-artist": {
    glow: "#b9542f",
    mesh: ["#d8b48f", "#c98a5c", "#e7d3b6"],
    radiusPx: 12,
    headingWeight: 600,
    ctaStyle: "solid",
  },
  "material-tradie-proof-card": {
    glow: "#c4622a",
    mesh: ["#d99a5c", "#caa06a", "#b9794a"],
    radiusPx: 10,
    headingWeight: 800,
    ctaStyle: "solid",
  },
  "healing-practitioner": {
    glow: "#6f9a6c",
    mesh: ["#bcd3ad", "#d6e3c4", "#a7c79f"],
    radiusPx: 22,
    headingWeight: 500,
    ctaStyle: "solid",
  },
  "consultant-contractor": {
    glow: "#2f6df0",
    mesh: ["#c9d2e0", "#dfe3ea", "#b7c2d6"],
    radiusPx: 5,
    headingWeight: 700,
    ctaStyle: "solid",
  },
};

export const STUDIO_ROOM_RENDERER_CSS = `
.studio-room {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  isolation: isolate;
  color: var(--studio-room-text);
  background:
    radial-gradient(circle at 12% 6%, color-mix(in srgb, var(--studio-room-accent) 18%, transparent), transparent 30rem),
    linear-gradient(180deg, var(--studio-room-bg), color-mix(in srgb, var(--studio-room-surface) 76%, var(--studio-room-bg)));
  border-radius: 28px;
  padding: clamp(16px, 5vw, 42px);
  position: relative;
}
.studio-room::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(48rem 34rem at 10% 0%, color-mix(in srgb, var(--studio-room-mesh-a) 58%, transparent), transparent 65%),
    radial-gradient(34rem 30rem at 95% 14%, color-mix(in srgb, var(--studio-room-mesh-b) 42%, transparent), transparent 68%),
    radial-gradient(32rem 28rem at 42% 100%, color-mix(in srgb, var(--studio-room-mesh-c) 38%, transparent), transparent 72%);
  opacity: 0.72;
  transform: translate3d(0,0,0);
  animation: studioRoomMeshDrift 24s ease-in-out infinite alternate;
}
.studio-room::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 100% at 50% -12%, transparent 60%, rgba(0,0,0,0.08)),
    repeating-linear-gradient(0deg, rgba(0,0,0,0.014) 0 1px, transparent 1px 3px);
  mix-blend-mode: multiply;
}
@keyframes studioRoomMeshDrift {
  from { transform: translate3d(-1.2%, -0.8%, 0) scale(1); }
  to { transform: translate3d(1.4%, 1%, 0) scale(1.04); }
}
.studio-room *, .studio-room *::before, .studio-room *::after { box-sizing: border-box; min-width: 0; }
.studio-room img { display: block; max-width: 100%; height: auto; }
.studio-room a { color: inherit; }
.studio-room > * {
  position: relative;
  z-index: 1;
}
.studio-room a:focus-visible, .studio-room button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--studio-room-accent) 80%, var(--studio-room-text));
  outline-offset: 3px;
  border-radius: 6px;
}
.studio-room--canvas { outline: 1px solid color-mix(in srgb, var(--studio-room-accent) 40%, transparent); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.24); }
.studio-room[data-reduced-motion="true"] *, .studio-room[data-reduced-motion="true"] *::before, .studio-room[data-reduced-motion="true"] *::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
.studio-room[data-reduced-motion="true"]::before {
  animation: none !important;
}
.studio-room__header { display: grid; gap: 12px; margin: 0 0 20px; align-items: start; }
.studio-room__header-line { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.studio-room__eyebrow { margin: 0; color: var(--studio-room-muted); font-size: 0.74rem; font-weight: 760; letter-spacing: 0; text-transform: uppercase; }
.studio-room__draft-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--studio-room-accent) 32%, transparent);
  background: color-mix(in srgb, var(--studio-room-surface) 72%, transparent);
  color: color-mix(in srgb, var(--studio-room-text) 76%, transparent);
  padding: 6px 10px;
  font-size: 0.68rem;
  font-weight: 760;
  letter-spacing: 0;
  text-transform: uppercase;
}
.studio-room__draft-pill::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--studio-room-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--studio-room-glow) 22%, transparent);
}
.studio-room__title { margin: 0; font-size: clamp(2.2rem, 5vw, 5.8rem); line-height: 0.94; letter-spacing: 0; overflow-wrap: anywhere; font-weight: var(--studio-room-heading-weight); }
.studio-room__mobile-action {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--studio-room-text);
  color: var(--studio-room-bg);
  padding: 13px 18px;
  text-decoration: none;
  font-weight: 760;
  box-shadow: 0 14px 36px rgba(0,0,0,0.16);
}
.studio-room__mobile-sticky-bar {
  position: sticky;
  bottom: 12px;
  z-index: 5;
  margin: 28px 0 4px;
  display: grid;
  justify-content: stretch;
  pointer-events: none;
}
.studio-room__mobile-sticky-action {
  pointer-events: auto;
  display: inline-flex;
  width: 100%;
  max-width: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-room-text) 96%, var(--studio-room-accent));
  color: var(--studio-room-bg);
  padding: 14px 18px;
  text-decoration: none;
  font-weight: 760;
  letter-spacing: 0;
  box-shadow: 0 18px 48px color-mix(in srgb, var(--studio-room-text) 38%, transparent);
}
.studio-room__chambers { display: grid; gap: 18px; }
.studio-room__chamber {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--studio-room-muted) 24%, transparent);
  border-radius: var(--studio-room-radius);
  background: color-mix(in srgb, var(--studio-room-surface) 88%, transparent);
  padding: clamp(16px, 4vw, 28px);
  box-shadow: 0 22px 70px -38px rgba(0,0,0,0.28), inset 0 1px 0 color-mix(in srgb, white 44%, transparent);
  backdrop-filter: blur(3px);
}
.studio-room__chamber--entrance, .studio-room__chamber--threshold { min-height: min(72dvh, 720px); display: grid; align-content: center; }
.studio-room__chamber--gallery, .studio-room__chamber--works { background: color-mix(in srgb, var(--studio-room-surface) 92%, var(--studio-room-bg)); }
.studio-room__chamber--invitation, .studio-room__chamber--contact, .studio-room__chamber--enquiry { background: color-mix(in srgb, var(--studio-room-accent) 13%, var(--studio-room-surface)); }
.studio-room__chamber-title { margin: 0; font-size: clamp(1.45rem, 3vw, 3.2rem); line-height: 1; letter-spacing: 0; overflow-wrap: anywhere; font-weight: var(--studio-room-heading-weight); }
.studio-room__summary { margin: 10px 0 0; max-width: 62ch; color: var(--studio-room-muted); font-size: clamp(1rem, 0.5vw + 0.8rem, 1.14rem); line-height: 1.65; }
.studio-room__objects { display: grid; gap: 14px; margin-top: 18px; }
.studio-room__object {
  overflow: hidden;
  border-radius: calc(var(--studio-room-radius) * 0.8);
  border: 1px solid color-mix(in srgb, var(--studio-room-muted) 18%, transparent);
  background: color-mix(in srgb, white 18%, var(--studio-room-surface));
  padding: 14px;
  transition: border-color 180ms ease, box-shadow 220ms ease, opacity 220ms ease, transform 220ms ease;
}
.studio-room--editor-preview .studio-room__object {
  cursor: pointer;
}
.studio-room--editor-preview .studio-room__object:hover {
  border-color: color-mix(in srgb, var(--studio-room-glow) 44%, transparent);
  box-shadow: 0 22px 54px -32px color-mix(in srgb, var(--studio-room-glow) 48%, transparent);
  transform: translateY(-2px);
}
.studio-room__object--headline, .studio-room__object--text { border-color: transparent; background: transparent; padding: 0; }
.studio-room__object.is-selected {
  border-color: var(--studio-room-glow);
  box-shadow:
    0 0 0 2px var(--studio-room-glow),
    0 0 0 8px color-mix(in srgb, var(--studio-room-glow) 18%, transparent),
    0 30px 70px -36px color-mix(in srgb, var(--studio-room-glow) 58%, transparent);
}
.studio-room__object.is-selected.studio-room__object--headline,
.studio-room__object.is-selected.studio-room__object--text {
  padding: 10px 12px;
  background: color-mix(in srgb, var(--studio-room-glow) 7%, transparent);
}
.studio-room[data-selection-mode="spotlight"] .studio-room__object:not(.is-selected) {
  opacity: 0.5;
  filter: saturate(0.82);
}
.studio-room__object--headline h3, .studio-room__object--text h3 { margin: 0; font-size: clamp(1.6rem, 4vw, 3.8rem); line-height: 1; letter-spacing: 0; }
.studio-room__object--headline p, .studio-room__object--text p, .studio-room__object p { color: var(--studio-room-muted); font-size: clamp(1rem, 0.4vw + 0.85rem, 1.1rem); line-height: 1.65; }
.studio-room__media { position: relative; overflow: hidden; border-radius: calc(var(--studio-room-radius) * 0.7); background: color-mix(in srgb, var(--studio-room-muted) 18%, var(--studio-room-surface)); aspect-ratio: 4 / 5; }
.studio-room__media[data-aspect="square"] { aspect-ratio: 1; }
.studio-room__media[data-aspect="landscape"] { aspect-ratio: 16 / 10; }
.studio-room__media img { width: 100%; height: 100%; object-fit: cover; }
.studio-room__image-empty {
  position: relative;
  overflow: hidden;
  display: grid;
  min-height: 10rem;
  place-items: center;
  border-radius: inherit;
  border: 1px dashed color-mix(in srgb, var(--studio-room-muted) 38%, transparent);
  color: color-mix(in srgb, var(--studio-room-text) 78%, transparent);
  text-align: center;
  padding: 18px;
  font-size: 0.92rem;
  background:
    radial-gradient(110% 70% at 22% 12%, color-mix(in srgb, var(--studio-room-mesh-a) 52%, transparent), transparent 58%),
    radial-gradient(100% 90% at 92% 90%, color-mix(in srgb, var(--studio-room-accent) 30%, transparent), transparent 62%),
    linear-gradient(140deg, color-mix(in srgb, var(--studio-room-surface) 62%, var(--studio-room-bg)), color-mix(in srgb, var(--studio-room-muted) 18%, var(--studio-room-surface)));
}
.studio-room__image-empty::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.18) 0.5px, transparent 0.7px), repeating-linear-gradient(125deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 9px);
  background-size: 4px 4px, auto;
  mix-blend-mode: overlay;
}
.studio-room__empty { display: grid; min-height: 10rem; place-items: center; border-radius: 18px; border: 1px dashed color-mix(in srgb, var(--studio-room-muted) 38%, transparent); color: var(--studio-room-muted); text-align: center; padding: 18px; font-size: 0.92rem; }
.studio-room__card-title { margin: 12px 0 0; font-size: 1.12rem; line-height: 1.2; }
.studio-room__service-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.studio-room__chip { display: inline-flex; align-items: center; min-height: 28px; border-radius: 999px; padding: 4px 12px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0; background: color-mix(in srgb, var(--studio-room-accent) 14%, transparent); color: var(--studio-room-text); border: 1px solid color-mix(in srgb, var(--studio-room-accent) 32%, transparent); }
.studio-room__attribution { margin: 8px 0 0; font-size: 0.86rem; color: var(--studio-room-muted); font-weight: 600; }
.studio-room__source { margin: 2px 0 0; font-size: 0.78rem; color: var(--studio-room-muted); }
.studio-room__quote { margin: 0; font-size: clamp(1.1rem, 0.6vw + 0.9rem, 1.45rem); line-height: 1.5; font-style: italic; }
.studio-room__badge { display: inline-flex; width: fit-content; border-radius: 999px; background: color-mix(in srgb, var(--studio-room-accent) 16%, transparent); color: var(--studio-room-text); padding: 8px 12px; font-size: 0.82rem; font-weight: 760; }
.studio-room__credential-issuer { margin: 4px 0 0; font-size: 0.84rem; color: var(--studio-room-muted); font-weight: 600; }
.studio-room__action { display: inline-flex; width: fit-content; max-width: 100%; min-height: 48px; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--studio-room-text) 16%, transparent); background: var(--studio-room-text); color: var(--studio-room-bg); padding: 13px 18px; text-decoration: none; font-weight: 760; box-shadow: 0 16px 34px -18px color-mix(in srgb, var(--studio-room-glow) 70%, transparent); }
.studio-room__action[data-cta-style="outline"],
.studio-room__mobile-action[data-cta-style="outline"],
.studio-room__mobile-sticky-action[data-cta-style="outline"] {
  background: transparent;
  color: var(--studio-room-text);
  border-color: color-mix(in srgb, var(--studio-room-text) 38%, transparent);
  box-shadow: none;
}
.studio-room__object--cta {
  background: linear-gradient(135deg, color-mix(in srgb, var(--studio-room-accent) 18%, var(--studio-room-surface)), color-mix(in srgb, var(--studio-room-surface) 86%, transparent));
  border-color: color-mix(in srgb, var(--studio-room-accent) 32%, transparent);
}
@media (min-width: 760px) {
  .studio-room__header { grid-template-columns: minmax(0, 1fr) auto; align-items: end; }
  .studio-room__objects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .studio-room__chamber--entrance .studio-room__objects, .studio-room__chamber--threshold .studio-room__objects { grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.74fr); align-items: center; }
  .studio-room__object--headline, .studio-room__object--text { grid-column: span 1; }
  .studio-room__object--cta, .studio-room__object--contact, .studio-room__object--portal, .studio-room__object--link, .studio-room__object--service, .studio-room__object--credential { align-self: start; }
}
@media (max-width: 759px) {
  .studio-room {
    border-radius: 24px;
    padding: 14px;
  }
  .studio-room__header {
    gap: 10px;
    margin-bottom: 16px;
  }
  .studio-room__title {
    font-size: clamp(2rem, 5vw, 4.6rem);
  }
  .studio-room__mobile-action {
    width: 100%;
  }
  .studio-room__chambers {
    gap: 14px;
  }
  .studio-room__chamber {
    padding: 18px;
    border-radius: calc(var(--studio-room-radius) * 0.9);
  }
  .studio-room__chamber--entrance,
  .studio-room__chamber--threshold {
    min-height: min(62dvh, 560px);
  }
  .studio-room__objects {
    gap: 12px;
  }
  .studio-room__mobile-sticky-bar {
    bottom: 8px;
  }
  .studio-room__mobile-sticky-action {
    min-height: 56px;
  }
}

/* gallery-artist: editorial, generous, image-forward */
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__title { font-size: clamp(2.6rem, 6vw, 6.4rem); letter-spacing: 0; }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__eyebrow { letter-spacing: 0; }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__chamber--gallery { padding: clamp(20px, 6vw, 56px); background: color-mix(in srgb, var(--studio-room-surface) 96%, var(--studio-room-bg)); }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__chamber--gallery .studio-room__objects { gap: 22px; }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__object--work, .studio-room[data-template-kit-id="gallery-artist"] .studio-room__object--image { border: none; background: transparent; padding: 0; }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__media { box-shadow: 0 18px 48px rgba(0,0,0,0.16); border-radius: 14px; }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__action { background: transparent; color: var(--studio-room-text); border: 1px solid color-mix(in srgb, var(--studio-room-text) 38%, transparent); }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__chamber { box-shadow: 0 30px 82px -54px rgba(70,48,12,0.45); }
.studio-room[data-template-kit-id="gallery-artist"] .studio-room__object--work .studio-room__card-title { font-family: Georgia, serif; font-style: italic; font-weight: 500; }

/* cultural-community-artist: archive pacing, evidence wall, partnership invitation */
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__chamber { border-left: 4px solid color-mix(in srgb, var(--studio-room-accent) 56%, transparent); border-radius: 18px; }
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__chamber--proof, .studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__chamber--gallery { background: color-mix(in srgb, var(--studio-room-surface) 94%, var(--studio-room-bg)); }
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__chamber-title::before { content: "Archive / "; color: var(--studio-room-muted); font-size: 0.42em; letter-spacing: 0; text-transform: uppercase; display: block; margin-bottom: 8px; font-style: normal; font-weight: 700; }
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__object--proof { border-left: 2px solid color-mix(in srgb, var(--studio-room-accent) 48%, transparent); }
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__object--work,
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__object--service {
  border-left: 2px solid color-mix(in srgb, var(--studio-room-accent) 42%, transparent);
  background: color-mix(in srgb, var(--studio-room-surface) 86%, transparent);
}
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__source {
  letter-spacing: 0;
  text-transform: uppercase;
}
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__chamber--invitation .studio-room__action { background: var(--studio-room-accent); color: var(--studio-room-surface); }
.studio-room[data-template-kit-id="cultural-community-artist"] .studio-room__mobile-sticky-action { background: var(--studio-room-accent); color: var(--studio-room-surface); }

/* material-tradie-proof-card: practical, proof-first, strong quote action */
.studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__chamber { border-radius: 14px; }
.studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__object { border-radius: 12px; }
.studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__object--service { border: 1px solid color-mix(in srgb, var(--studio-room-accent) 28%, transparent); }
.studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__chip { background: color-mix(in srgb, var(--studio-room-accent) 18%, var(--studio-room-surface)); border-color: color-mix(in srgb, var(--studio-room-accent) 40%, transparent); }
.studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__action, .studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__mobile-sticky-action { background: var(--studio-room-accent); color: #fff; border: 1px solid color-mix(in srgb, var(--studio-room-accent) 80%, var(--studio-room-text)); min-height: 52px; font-weight: 820; letter-spacing: 0; }
.studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__quote { font-style: normal; font-weight: 800; }
.studio-room[data-template-kit-id="material-tradie-proof-card"] .studio-room__mobile-sticky-action { border-radius: 12px; }

/* healing-practitioner: calm, soft, trust-building */
.studio-room[data-template-kit-id="healing-practitioner"] .studio-room__chamber { border-radius: 28px; border-color: color-mix(in srgb, var(--studio-room-accent) 22%, transparent); background: color-mix(in srgb, var(--studio-room-surface) 96%, var(--studio-room-bg)); }
.studio-room[data-template-kit-id="healing-practitioner"] .studio-room__object { border-radius: 22px; border-color: color-mix(in srgb, var(--studio-room-accent) 16%, transparent); }
.studio-room[data-template-kit-id="healing-practitioner"] .studio-room__chamber-title { letter-spacing: 0; font-weight: 600; }
.studio-room[data-template-kit-id="healing-practitioner"] .studio-room__quote { font-weight: 500; }
.studio-room[data-template-kit-id="healing-practitioner"] .studio-room__action, .studio-room[data-template-kit-id="healing-practitioner"] .studio-room__mobile-sticky-action { background: var(--studio-room-accent); color: var(--studio-room-surface); border-radius: 999px; box-shadow: 0 10px 28px color-mix(in srgb, var(--studio-room-accent) 24%, transparent); }
.studio-room[data-template-kit-id="healing-practitioner"] .studio-room__badge { background: color-mix(in srgb, var(--studio-room-accent) 22%, transparent); }
.studio-room[data-template-kit-id="healing-practitioner"] .studio-room__chamber--invitation { animation: studioRoomBreath 7s ease-in-out infinite; }
@keyframes studioRoomBreath {
  0%, 100% { box-shadow: 0 22px 70px -38px rgba(0,0,0,0.2); }
  50% { box-shadow: 0 30px 86px -34px color-mix(in srgb, var(--studio-room-accent) 36%, transparent); }
}
.studio-room[data-reduced-motion="true"] .studio-room__chamber--invitation { animation: none; }

/* consultant-contractor: crisp, sharp, high-conversion */
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__chamber { border-radius: 6px; border: 1px solid color-mix(in srgb, var(--studio-room-text) 14%, transparent); box-shadow: none; background: var(--studio-room-surface); }
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__object { border-radius: 4px; border-color: color-mix(in srgb, var(--studio-room-text) 14%, transparent); background: var(--studio-room-surface); }
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__title { font-size: clamp(2.0rem, 5vw, 4.4rem); letter-spacing: 0; font-weight: 760; }
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__chamber-title { font-weight: 700; }
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__action, .studio-room[data-template-kit-id="consultant-contractor"] .studio-room__mobile-action, .studio-room[data-template-kit-id="consultant-contractor"] .studio-room__mobile-sticky-action { border-radius: 4px; background: var(--studio-room-text); color: var(--studio-room-bg); border: 1px solid var(--studio-room-text); box-shadow: none; }
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__chip { border-radius: 4px; }
.studio-room[data-template-kit-id="consultant-contractor"]::before { opacity: 0.34; }
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__chamber--invitation { background: var(--studio-room-text); color: var(--studio-room-bg); }
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__chamber--invitation .studio-room__summary,
.studio-room[data-template-kit-id="consultant-contractor"] .studio-room__chamber--invitation .studio-room__object p { color: color-mix(in srgb, var(--studio-room-bg) 70%, transparent); }
`;

export function StudioRoomRenderer({
  room,
  viewport = "desktop",
  canvas = false,
  selectedObjectId = null,
  selectionMode = "ring",
  reducedMotion: forceReducedMotion = false,
  onSelectObject,
}: StudioRoomRendererProps): ReactElement {
  const publicRoom = toPublicRoomPayload(room);
  const tree = renderStudioRoom(publicRoom, { viewport });
  const reducedMotion = forceReducedMotion || publicRoom.rendererConfig.reducedMotion || tree.theme.motion === "still";
  const primaryAction = findPrimaryAction(tree.chambers);
  const kitTokens = tree.templateKitId ? KIT_RENDERER_TOKENS[tree.templateKitId] : undefined;
  const radiusPx = kitTokens?.radiusPx ?? radiusTokenToPixels(tree.theme.radius);
  const headingWeight = kitTokens?.headingWeight ?? (tree.theme.radius === "sharp" ? 700 : 600);
  const ctaStyle = kitTokens?.ctaStyle ?? "solid";
  const mesh = kitTokens?.mesh ?? [tree.theme.accent, tree.theme.surface, tree.theme.background];
  const style = {
    "--studio-room-bg": tree.theme.background,
    "--studio-room-surface": tree.theme.surface,
    "--studio-room-text": tree.theme.text,
    "--studio-room-muted": tree.theme.muted,
    "--studio-room-accent": tree.theme.accent,
    "--studio-room-glow": kitTokens?.glow ?? tree.theme.accent,
    "--studio-room-mesh-a": mesh[0],
    "--studio-room-mesh-b": mesh[1],
    "--studio-room-mesh-c": mesh[2],
    "--studio-room-radius": `${radiusPx}px`,
    "--studio-room-heading-weight": headingWeight,
    background: tree.theme.background,
    color: tree.theme.text,
    fontFamily: tree.theme.fontBody,
  } as CSSProperties;

  const attrs: Record<string, unknown> = {
    "data-testid": canvas ? "studio-room-canvas" : "studio-room-renderer",
    "data-room-id": tree.roomId,
    "data-room-state": tree.state,
    "data-viewport": viewport,
    "data-reduced-motion": reducedMotion ? "true" : "false",
    "data-selection-mode": selectionMode,
    className: `studio-room${canvas ? " studio-room--canvas" : ""}${onSelectObject ? " studio-room--editor-preview" : ""}`,
    style,
  };
  if (tree.templateKitId) {
    attrs["data-template-kit-id"] = tree.templateKitId;
  }

  return createElement(
    "article",
    attrs,
    createElement("style", null, STUDIO_ROOM_RENDERER_CSS),
    createElement(
      "header",
      { className: "studio-room__header" },
      createElement(
        "div",
        null,
        createElement(
          "div",
          { className: "studio-room__header-line" },
          createElement("p", { className: "studio-room__eyebrow" }, canvas ? "Draft room" : "Room"),
          canvas ? createElement("span", { className: "studio-room__draft-pill" }, "Private rehearsal") : null,
        ),
        createElement("h1", { className: "studio-room__title", style: { fontFamily: tree.theme.fontHeading } }, tree.title || "Untitled room"),
      ),
      primaryAction
        ? createElement(
            "a",
            {
              "data-testid": "studio-room-mobile-primary-cta",
              href: primaryAction.href,
              className: "studio-room__mobile-action",
              "data-cta-style": ctaStyle,
            },
            primaryAction.label,
          )
        : null,
    ),
    createElement(
      "div",
      { className: "studio-room__chambers" },
      tree.chambers.length > 0
        ? tree.chambers.map((chamber) => renderChamber(chamber, {
            headingFont: tree.theme.fontHeading,
            selectedObjectId,
            onSelectObject,
            ctaStyle,
          }))
        : createElement(
            "section",
            { className: "studio-room__chamber" },
            createElement("p", { className: "studio-room__empty" }, "This room is ready for its first chamber."),
          ),
    ),
    viewport === "mobile" && primaryAction
      ? createElement(
          "div",
          { className: "studio-room__mobile-sticky-bar" },
          createElement(
            "a",
            {
              "data-testid": "studio-room-mobile-sticky-cta",
              href: primaryAction.href,
              className: "studio-room__mobile-sticky-action",
              "data-cta-style": ctaStyle,
            },
            primaryAction.label,
          ),
        )
      : null,
  );
}

function renderChamber(
  chamber: RenderedChamber,
  options: {
    headingFont: string;
    selectedObjectId: string | null;
    onSelectObject?: (objectId: string) => void;
    ctaStyle: "solid" | "outline";
  },
): ReactElement {
  const role = roleForChamber(chamber.type);
  return createElement(
    "section",
    {
      key: chamber.id,
      "data-chamber-id": chamber.id,
      "data-chamber-type": chamber.type,
      "data-chamber-role": role,
      "data-mobile-layout": chamber.mobileLayout ?? "stack",
      className: `studio-room__chamber studio-room__chamber--${role}`,
    },
    createElement("h2", { className: "studio-room__chamber-title", style: { fontFamily: options.headingFont } }, chamber.title || "Untitled chamber"),
    chamber.summary ? createElement("p", { className: "studio-room__summary" }, chamber.summary) : null,
    createElement(
      "div",
      { className: "studio-room__objects" },
      chamber.objects.length > 0
        ? chamber.objects.map((object) => renderObject(object, options))
        : createElement("p", { className: "studio-room__empty" }, "This chamber is ready for content."),
    ),
  );
}

function renderObject(
  object: RenderedRoomObject,
  options?: {
    selectedObjectId: string | null;
    onSelectObject?: (objectId: string) => void;
    ctaStyle: "solid" | "outline";
  },
): ReactElement {
  const role = roleForObject(object.type);
  const selected = options?.selectedObjectId === object.id;
  const children: ReactNode[] = [];
  const meta = object as RenderedRoomObject & {
    priceLabel?: string;
    durationLabel?: string;
    attribution?: string;
    source?: string;
    issuer?: string;
    detail?: string;
  };
  if (object.image || role === "image" || role === "media" || role === "work") {
    children.push(renderMedia(object));
  }
  if (role === "badge" || role === "metadata") {
    children.push(createElement("span", { key: "badge", className: "studio-room__badge" }, object.title || object.label));
  } else if (role === "credential") {
    children.push(createElement("span", { key: "badge", className: "studio-room__badge" }, object.title || object.label));
    if (meta.issuer) {
      children.push(createElement("p", { key: "issuer", className: "studio-room__credential-issuer" }, meta.issuer));
    }
    if (meta.detail || object.body) {
      children.push(createElement("p", { key: "detail" }, meta.detail || object.body));
    }
  } else if (role === "testimonial" || role === "proof") {
    children.push(createElement("blockquote", { key: "quote", className: "studio-room__quote" }, object.body || object.title || object.label || "Proof note pending."));
    if (meta.attribution) {
      children.push(createElement("p", { key: "attribution", className: "studio-room__attribution" }, meta.attribution));
    }
    if (meta.source) {
      children.push(createElement("p", { key: "source", className: "studio-room__source" }, meta.source));
    }
  } else if (role !== "image" && role !== "media") {
    children.push(createElement("h3", { key: "title", className: "studio-room__card-title" }, object.title || object.label || "Untitled object"));
  }
  if (role === "service" && (meta.priceLabel || meta.durationLabel)) {
    const chips: ReactNode[] = [];
    if (meta.priceLabel) chips.push(createElement("span", { key: "price", className: "studio-room__chip" }, meta.priceLabel));
    if (meta.durationLabel) chips.push(createElement("span", { key: "duration", className: "studio-room__chip" }, meta.durationLabel));
    children.push(createElement("div", { key: "meta", className: "studio-room__service-meta" }, ...chips));
  }
  if (object.body && role !== "testimonial" && role !== "proof" && role !== "credential") {
    children.push(createElement("p", { key: "body" }, object.body));
  }
  if (!object.image && !object.body && !object.action && role !== "badge" && role !== "metadata" && role !== "credential") {
    children.push(createElement("p", { key: "empty", className: "studio-room__empty" }, "This room object is ready for content."));
  }
  if (object.action) {
    const actionAttrs = {
      key: "action",
      className: "studio-room__action",
      "data-cta-style": options?.ctaStyle ?? "solid",
    };
    children.push(
      options?.onSelectObject
        ? createElement("span", actionAttrs, object.action.label || "Open")
        : createElement("a", { ...actionAttrs, href: object.action.href }, object.action.label || "Open"),
    );
  }
  const interactiveAttrs = options?.onSelectObject
    ? {
        tabIndex: 0,
        role: "button",
        "aria-pressed": selected ? "true" : "false",
        "aria-label": `Select ${object.label || object.title || role} object`,
        onClick: () => options.onSelectObject?.(object.id),
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            options.onSelectObject?.(object.id);
          }
        },
      }
    : {};
  return createElement(
    "article",
    {
      key: object.id,
      "data-room-object-id": object.id,
      "data-room-object-type": object.type,
      "data-room-object-role": role,
      "data-selected": selected ? "true" : "false",
      className: `studio-room__object studio-room__object--${role}${selected ? " is-selected" : ""}`,
      ...interactiveAttrs,
    },
    ...children,
  );
}

function renderMedia(object: RenderedRoomObject): ReactElement {
  const aspect = object.aspectRatio ?? "portrait";
  return createElement(
    "div",
    { key: "media", className: "studio-room__media", "data-aspect": aspect },
    object.image?.src
      ? createElement("img", {
          src: object.image.src,
          alt: object.image.alt || object.title || object.label,
          loading: "lazy",
          style: { objectPosition: object.image.objectPosition ?? "50% 50%" },
        })
      : createElement("div", { className: "studio-room__image-empty" }, "Image ready to be chosen."),
  );
}

function findPrimaryAction(chambers: RenderedChamber[]): { label: string; href: string } | null {
  for (const object of chambers.flatMap((chamber) => chamber.objects)) {
    if (object.action?.label && object.action.href) return object.action;
  }
  return null;
}

function roleForChamber(type: string): string {
  if (type === "threshold" || type === "entrance") return "entrance";
  if (type === "gallery" || type === "works") return "gallery";
  if (type === "services") return "services";
  if (type === "proof" || type === "testimonials") return "proof";
  if (type === "invitation" || type === "contact" || type === "enquiry") return "invitation";
  if (type === "portal" || type === "links") return "portal";
  if (type === "story" || type === "statement") return "story";
  return "story";
}

function roleForObject(type: string): string {
  if (type === "headline" || type === "text") return type === "headline" ? "headline" : "text";
  if (type === "image" || type === "media") return type;
  if (type === "work" || type === "work-card") return "work";
  if (type === "service" || type === "service-card") return "service";
  if (type === "testimonial" || type === "proof" || type === "proof-card") return type === "testimonial" ? "testimonial" : "proof";
  if (type === "cta") return "cta";
  if (type === "link" || type === "link-card" || type === "portal") return type === "portal" ? "portal" : "link";
  if (type === "contact") return "contact";
  if (type === "credential") return "credential";
  if (type === "badge" || type === "metadata") return type;
  return "note";
}

function radiusTokenToPixels(radius: Room["theme"]["radius"]): number {
  if (radius === "sharp") return 6;
  if (radius === "round") return 24;
  return 16;
}
