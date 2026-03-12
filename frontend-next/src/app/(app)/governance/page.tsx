import Link from "next/link";

const governanceLinks = [
  { href: "/governance/systemic", label: "Systemic Mode" },
  { href: "/governance/sovereignty", label: "Sovereignty Index" },
  { href: "/governance/capital", label: "Capital Heatmap" },
  { href: "/governance/simulations", label: "Governance Simulations" },
  { href: "/governance/federation", label: "Federation Metrics" },
  { href: "/governance/collisions", label: "Conflict Reviews" },
];

export default function GovernanceIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Governance Center</h1>
          <p className="text-sm text-muted-foreground">
            Entry point for governance analytics, policy flows, and system health.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {governanceLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border bg-card px-5 py-4 hover:bg-accent transition-colors"
            >
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.href}</p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
