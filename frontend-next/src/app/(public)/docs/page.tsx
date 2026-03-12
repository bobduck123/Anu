import Link from "next/link";

const docsLinks = [
  { href: "/transparency", label: "Transparency Dashboard" },
  { href: "/governance", label: "Governance Center" },
  { href: "/education/templates", label: "Education Templates" },
  { href: "/cost-lowering", label: "Weekly Cost-Lowering Engine" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Documentation</h1>
          <p className="text-sm text-muted-foreground">
            Alpha documentation hub for governance, transparency, and community operations.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docsLinks.map((item) => (
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
