import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Contact</h1>
          <p className="text-sm text-muted-foreground">
            Community-first support channels for alpha launch.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
          <p>
            Primary channel: in-platform updates through the community feed and organizer spaces.
          </p>
          <p>
            For issue tracking during alpha, use the governance and transparency views to attach context to reports.
          </p>
          <p>
            Prefer self-service first:{" "}
            <Link className="underline" href="/docs">
              Documentation
            </Link>
            ,{" "}
            <Link className="underline" href="/transparency">
              Transparency
            </Link>
            ,{" "}
            <Link className="underline" href="/governance">
              Governance
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
