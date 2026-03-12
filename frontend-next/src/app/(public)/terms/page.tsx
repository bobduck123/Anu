export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Terms</h1>
          <p className="text-sm text-muted-foreground">
            Alpha terms for responsible participation in civic coordination tools.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
          <p>Use the platform lawfully and respectfully.</p>
          <p>Do not submit fraudulent actions, claims, or proof artifacts.</p>
          <p>Administrative and moderation decisions are recorded for auditability and system safety.</p>
          <p>Terms will be expanded before general availability.</p>
        </section>
      </div>
    </div>
  );
}
