"use client";

import { use } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Building2,
  Image as ImageIcon,
  CreditCard,
  Ticket,
  DoorOpen,
  Newspaper,
  Truck,
  StickyNote,
  Frame,
  Briefcase,
  Map as MapIcon,
} from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_PRESENCE_API_BASE_URL ??
  "http://localhost:5000";

// Physical-use-case grid — each card explains where to put the QR/NFC link.
// Includes a `source` tag suggestion for analytics differentiation.
const USE_CASES = [
  { icon: Frame, label: "Artwork label", source: "artwork_label", desc: "QR sticker beside a piece on the wall." },
  { icon: ImageIcon, label: "Exhibition card", source: "exhibition_card", desc: "Printed card at openings, fairs, residencies." },
  { icon: Building2, label: "Studio door", source: "studio_door", desc: "Visitors arriving in person can scan to enter your world." },
  { icon: Ticket, label: "Event badge", source: "event_badge", desc: "Conferences, festivals, openings, residencies." },
  { icon: CreditCard, label: "Business card", source: "business_card", desc: "Replace 'website' with a single Presence link." },
  { icon: DoorOpen, label: "Venue entrance", source: "venue_entrance", desc: "Programs, partnerships, visit info on arrival." },
  { icon: Newspaper, label: "Flyer / poster", source: "flyer", desc: "Workshops, announcements, public programs." },
  { icon: StickyNote, label: "Workshop handout", source: "workshop_handout", desc: "Sessions, training, intake materials." },
  { icon: Truck, label: "Vehicle / sticker", source: "vehicle_sticker", desc: "Tradies and field-service practices." },
  { icon: Briefcase, label: "Consultant leave-behind", source: "consultant_leavebehind", desc: "Capability dossier as a single link." },
  { icon: MapIcon, label: "Directory / map listing", source: "directory_map", desc: "Public listings linking out to your Presence." },
];

export default function StudioQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, loading, error, authRequired } = useOwnerNode(nodeId);

  if (loading) return <Loading label="Loading QR tools..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/qr`}
        error={error ?? "Node not found."}
      />
    );
  }

  const qrUrl = `${API_BASE}/api/presence/public/${node.slug}/qr`;
  const vcardUrl = `${API_BASE}/api/presence/public/${node.slug}/vcard`;
  const isPublished = node.status === "published";

  async function copyPublicUrl() {
    if (!node?.public_url || typeof navigator === "undefined") return;
    await navigator.clipboard?.writeText(node.public_url);
  }

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Physical-world bridge
          </p>
          <h2 className="text-2xl font-semibold text-[var(--p-studio-text)]">QR and NFC</h2>
          <p className="max-w-sm text-sm leading-6 text-[var(--p-studio-muted)]">
            Put this Presence on exhibition cards, studio walls, business
            cards, event badges, venue entrances, posters, and artwork labels.
          </p>
        </div>

        {!isPublished && (
          <div className="w-full rounded-2xl border border-amber-700/40 bg-amber-900/20 p-4 text-sm leading-6 text-amber-100">
            <p className="font-semibold">QR is not public-ready yet</p>
            <p className="mt-1 text-xs leading-5 text-amber-200/80">
              This Presence is currently <span className="font-mono">{node.status}</span>. Anyone scanning the QR code lands on a 404 page until you publish. Use the QR for preview only until then.
            </p>
          </div>
        )}

        {isPublished ? (
          <>
            <div className="p-6 rounded-3xl bg-white shadow-xl">
              <img src={qrUrl} alt={`QR code for ${node.display_name}`} className="w-56 h-56" />
            </div>

            <div className="w-full rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4 text-center">
              <p className="text-xs text-[var(--p-studio-muted)]">Public Presence URL</p>
              <p className="mt-2 break-all font-mono text-xs text-[var(--p-studio-text)]">
                {node.public_url}
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void copyPublicUrl()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--p-studio-border)] px-4 py-3 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
              >
                <Copy className="h-4 w-4" />
                Copy URL
              </button>
              <a
                href={vcardUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--p-studio-border)] px-4 py-3 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
              >
                vCard
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <a
              href={qrUrl}
              download={`${node.slug}-qr.svg`}
              className="px-5 py-2.5 rounded-xl bg-[var(--p-studio-accent)] text-sm font-semibold text-stone-950 hover:bg-orange-300 transition-colors"
            >
              Download SVG
            </a>
          </>
        ) : (
          <div className="w-full rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--p-studio-text)]">Public QR hidden until publish</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--p-studio-muted)]">
              Studio keeps draft and private Presences off public QR, vCard, and download routes.
            </p>
            <Link
              href={`/studio/${nodeId}/settings`}
              className="mt-5 inline-flex rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
            >
              Open publish settings
            </Link>
          </div>
        )}

        {/* Physical-world use cases — gives owners a real plan for the QR */}
        <section className="w-full mt-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
              Physical-world bridge
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--p-studio-text)]">
              Where to put your Presence
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--p-studio-muted)]">
              Each surface can carry the same QR. To tell scans apart in your
              Signals, suggested source tags are shown below — append them as
              <span className="font-mono"> ?source=&lt;tag&gt;</span> to the URL on
              that physical surface.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {USE_CASES.map((uc) => (
              <li
                key={uc.source}
                className="flex items-start gap-3 rounded-xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-3"
              >
                <uc.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--p-studio-accent)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--p-studio-text)]">{uc.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--p-studio-muted)]">{uc.desc}</p>
                  <code className="mt-1.5 inline-block rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-[var(--p-studio-muted)]">
                    ?source={uc.source}
                  </code>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4 text-xs leading-5 text-[var(--p-studio-muted)]">
            <p className="font-semibold text-[var(--p-studio-text)]">NFC tags</p>
            <p className="mt-1.5">
              For NFC stickers, write the public URL with the appropriate
              source query parameter using any consumer NFC writer app. The QR
              code uses the same destination, so a tag works whether someone
              taps or scans.
            </p>
            <p className="mt-2">
              Anonymous scans never become named contacts. A named contact only
              appears in your Enquiries when someone submits the form on your
              public Presence.
            </p>
          </div>
        </section>
      </div>
    </StudioShell>
  );
}
