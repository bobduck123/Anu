import Link from "next/link";
import { ArrowRight, BookOpenText, ShieldCheck, Sparkles } from "lucide-react";

const docsLinks = [
  {
    href: "/transparency",
    label: "Transparency Dashboard",
    detail: "Public totals, relief capacity, and node-level ledger summaries.",
    icon: ShieldCheck,
  },
  {
    href: "/governance",
    label: "Governance Center",
    detail: "Institutional formulas, simulations, and stewardship controls.",
    icon: BookOpenText,
  },
  {
    href: "/education/templates",
    label: "Education Templates",
    detail: "Learning presentation systems, layered pathways, and archetypes.",
    icon: Sparkles,
  },
  {
    href: "/cost-lowering",
    label: "Cost-Lowering Engine",
    detail: "Weekly optimization routines and resilience pathways.",
    icon: ArrowRight,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(242,199,134,0.14),transparent_28%),radial-gradient(circle_at_86%_8%,rgba(63,110,160,0.18),transparent_34%),linear-gradient(180deg,#0a1322_0%,#08111e_60%,#08101a_100%)]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-24 md:px-8">
        <header className="rounded-[1.6rem] border border-white/14 bg-[linear-gradient(140deg,rgba(11,20,36,0.84),rgba(8,16,29,0.82))] p-6 text-slate-100 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.92)] backdrop-blur-xl md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#f3cd92]/88">Documentation</p>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Manara Operations Library</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Navigate governance, transparency, and education references for cultural operations.
            Start here before entering deeper administrative and simulation pathways.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {docsLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100 transition-colors hover:border-white/20 hover:bg-[linear-gradient(152deg,rgba(11,20,36,0.92),rgba(8,15,28,0.94))]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#f3cd92]/88">
                      Open route
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/6 text-[#f3cd92]">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.href}</p>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
