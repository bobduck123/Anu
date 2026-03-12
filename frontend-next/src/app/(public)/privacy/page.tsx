import Link from "next/link";
import { brand } from '@/lib/brand';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Privacy</h1>
          <p className="text-sm text-muted-foreground">
            {brand.privacyLine}
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
          <p>Personal data is not sold. Public views prioritize pseudonymous participation and aggregate metrics.</p>
          <p>Operational data is used to deliver community workflows, accountability, and resilience analytics.</p>
          <p>
            Signed-in members can manage consent preferences in{" "}
            <Link className="underline" href="/settings/privacy">
              Privacy Settings
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
