import Link from "next/link";
import { ArrowRight, LifeBuoy, MessageSquareText } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="manara-grid-hero min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(242,199,134,0.14),transparent_28%),radial-gradient(circle_at_86%_8%,rgba(63,110,160,0.18),transparent_34%),linear-gradient(180deg,#0a1322_0%,#08111e_60%,#08101a_100%)]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-24 md:px-8">
        <header className="manara-glass-panel rounded-[1.6rem] border border-white/14 p-6 text-slate-100 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#f3cd92]/88">Contact</p>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Community support routes</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Support remains community-first. Use documentation and transparency first, then escalate through
            governance routes with context-rich reports.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#f3cd92]/86">
              <MessageSquareText className="h-4 w-4" />
              Primary channel
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Use in-platform updates through the community feed, organizer spaces, and route-linked notifications.
            </p>
          </article>

          <article className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#f3cd92]/86">
              <LifeBuoy className="h-4 w-4" />
              Alpha issue reports
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              For hosted alpha incidents, attach context from governance and transparency views so triage teams
              can reproduce and route quickly.
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Self-service first</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { href: "/docs", label: "Documentation" },
              { href: "/transparency", label: "Transparency" },
              { href: "/governance", label: "Governance" },
            ].map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="manara-glass-chip inline-flex items-center gap-2 border border-white/14 bg-white/6 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-100 transition-colors hover:border-white/24 hover:bg-white/12"
              >
                {route.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
