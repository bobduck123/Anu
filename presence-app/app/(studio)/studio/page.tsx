"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Globe, AlertCircle } from "lucide-react";
import { listNodes } from "@/lib/api/owner";
import type { PresenceNode } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/client";
import { Loading, Empty, StatusPill } from "@/components/ui";

export default function StudioIndexPage() {
  const [nodes, setNodes] = useState<PresenceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Sign in to access your studio.");
          return;
        }
        const data = await listNodes(session.access_token);
        setNodes(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load your nodes.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[var(--p-studio-text)]">Your Studio</h1>
        <p className="text-sm text-[var(--p-studio-muted)]">Select a presence to manage</p>
      </header>

      {loading && <Loading label="Loading your nodes..." />}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-800 bg-red-950/30 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && nodes.length === 0 && (
        <Empty
          title="No presence nodes yet"
          body="Ask your administrator to create a node and assign it to your account."
        />
      )}

      {!loading && nodes.length > 0 && (
        <div className="flex flex-col gap-2">
          {nodes.map((node) => (
            <Link
              key={node.id}
              href={`/studio/${node.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)] hover:border-[var(--p-studio-accent)]/40 transition-colors group"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="font-medium text-[var(--p-studio-text)] truncate">
                  {node.display_name}
                </span>
                <div className="flex items-center gap-2 text-xs text-[var(--p-studio-muted)]">
                  <StatusPill status={node.status} />
                  {node.public_url && (
                    <span className="flex items-center gap-1 truncate">
                      <Globe className="w-3 h-3" />
                      {node.slug}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--p-studio-muted)] group-hover:text-[var(--p-studio-accent)] shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
