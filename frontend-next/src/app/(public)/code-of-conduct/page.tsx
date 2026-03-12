export default function CodeOfConductPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Code of Conduct</h1>
          <p className="text-sm text-muted-foreground">
            Shared standards for safety, dignity, and accountable collaboration.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
          <p>Act with care, respect local context, and avoid harassment or discriminatory behavior.</p>
          <p>Do not misuse governance tools to intimidate, manipulate, or silence participants.</p>
          <p>Report harmful behavior through platform governance and moderation channels.</p>
          <p>Repeated violations can lead to suspension of platform privileges.</p>
        </section>
      </div>
    </div>
  );
}
