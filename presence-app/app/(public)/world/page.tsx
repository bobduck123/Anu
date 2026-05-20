import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Compass, DoorOpen, Footprints, LockKeyhole, Map, MapPinned, NotebookPen, Sparkles } from "lucide-react";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";

export const metadata: Metadata = {
  title: "Presence World is forming",
  description:
    "Rooms will open into a shared map once enough places, paths, and traces exist.",
};

export default function PresenceWorldPage() {
  return (
    <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 hover:text-stone-200">
          Presence
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="rounded-3xl border border-stone-800 bg-stone-900 p-6 sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-300 text-stone-950">
              <LockKeyhole className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
              World hidden / forming
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              {PRESENCE_GRAPH_COPY.world}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-300">
              {PRESENCE_GRAPH_COPY.worldForming}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/presence-chooser"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-200"
              >
                Create a Presence Room
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:border-stone-500"
              >
                Enter Rooms
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.18),transparent_34%),#1c1917] p-6">
            <Map className="h-8 w-8 text-orange-300" aria-hidden />
            <h2 className="mt-4 text-2xl font-semibold">No fake map.</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              Paths appear from real saves, notes, encounters, and Room Keys. Until then, the World remains a locked promise,
              not an empty screen.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                "Rooms must be active.",
                "Encounters must be real.",
                "Mood Boards must shape taste.",
                "Paths must have directions.",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-stone-800 bg-stone-950/50 p-3 text-sm text-stone-200">
                  <Compass className="h-4 w-4 text-orange-300" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is forming — names the four ingredients the visitor can add right now */}
        <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">What is forming</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Four ingredients the World is built from.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: DoorOpen,
                title: "Rooms",
                copy: "Each paying Room owner carries a Presence Room — a living business card opened via NFC, QR, badge, sticker, poster, or share.",
              },
              {
                icon: Sparkles,
                title: "Encounters",
                copy: "Real-world traces — every tap, scan, or share that brought a visitor into a Room. The World only forms from these, never from fake activity.",
              },
              {
                icon: NotebookPen,
                title: "Mood Boards & Field Notes",
                copy: "Visitors who become Observers shape the World by collecting Rooms into maps of taste and leaving traces inside them.",
              },
              {
                icon: Footprints,
                title: "Paths",
                copy: "Walks between Rooms, with waypoints, directions, and forks. Paths become the geometry the World will eventually open along.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-stone-800 bg-stone-950/40 p-4"
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold text-stone-50">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-300">{item.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How Rooms become Paths become World — narrative arc, not a feature list */}
        <section className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.08),transparent_40%),#1c1917] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">How the World opens</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            From Rooms, to Paths, to a shared map.
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Rooms become real.",
                copy: "Owners share them through NFC, QR, badges, posters, and direct links. Encounters accumulate from physical-world taps.",
              },
              {
                step: "02",
                title: "Paths emerge.",
                copy: "Observers save Rooms, build Mood Boards, leave Field Notes. Walks between Rooms turn into named Paths with waypoints and forks.",
              },
              {
                step: "03",
                title: "World opens.",
                copy: "Once Paths thicken into a real graph of places and taste, the locked World begins to open into a shared map — not before.",
              },
            ].map((item) => (
              <li key={item.step} className="rounded-2xl border border-stone-800 bg-stone-950/40 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-orange-300">{item.step}</p>
                <p className="mt-2 text-lg font-semibold text-stone-50">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-300">{item.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Direct next steps — don't leave the page as a dead end */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/presence-chooser"
            className="group rounded-3xl border border-stone-800 bg-stone-900 p-5 transition hover:-translate-y-0.5 hover:border-orange-300/70"
          >
            <DoorOpen className="h-6 w-6 text-orange-300" aria-hidden />
            <p className="mt-4 text-lg font-semibold">Create a Room</p>
            <p className="mt-1 text-sm leading-6 text-stone-300">Bring the first ingredient. Set the direction in the Studio.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-200 transition group-hover:gap-2">
              Open Studio <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
          <Link
            href="/gallery"
            className="group rounded-3xl border border-stone-800 bg-stone-900 p-5 transition hover:-translate-y-0.5 hover:border-orange-300/70"
          >
            <MapPinned className="h-6 w-6 text-orange-300" aria-hidden />
            <p className="mt-4 text-lg font-semibold">Enter Rooms</p>
            <p className="mt-1 text-sm leading-6 text-stone-300">Walk through the Rooms that already exist as Guest, or save them with an Observer Mask.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-200 transition group-hover:gap-2">
              Open gallery <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
          <Link
            href="/observer/mood-boards"
            className="group rounded-3xl border border-stone-800 bg-stone-900 p-5 transition hover:-translate-y-0.5 hover:border-orange-300/70"
          >
            <NotebookPen className="h-6 w-6 text-orange-300" aria-hidden />
            <p className="mt-4 text-lg font-semibold">Build a Mood Board</p>
            <p className="mt-1 text-sm leading-6 text-stone-300">{PRESENCE_GRAPH_COPY.moodBoard}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-200 transition group-hover:gap-2">
              Open Mood Boards <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
