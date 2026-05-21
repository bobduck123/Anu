"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { listHalls, type HallList, type HallListQuery } from "@/lib/api/halls";
import { PresenceApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { HALL_TYPE_LABELS, PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { HallType, PresenceHall } from "@/lib/api/types";
import { HallCard } from "./HallCard";
import { HallShell } from "./HallShell";
import { PresenceButton, PresenceChip, PresenceEmpty, PresenceEyebrow, PresenceSectionHead } from "../garden/primitives";

type FilterKey = "all" | "live" | "scheduled" | "from_seeds" | "near_paths";

const STATUS_FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All Halls" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Upcoming" },
  { key: "from_seeds", label: "From your Seeds" },
  { key: "near_paths", label: "Near your Paths" },
];

export function HallsIndexClient() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [hallType, setHallType] = useState<HallType | "any">("any");
  const [token, setToken] = useState<string | null>(null);
  const [halls, setHalls] = useState<HallList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    setToken(session?.access_token ?? null);

    const query: HallListQuery = {};
    if (filter === "live" || filter === "scheduled") query.status = filter;
    if (filter === "from_seeds") query.from_seeds = true;
    if (filter === "near_paths") query.near_paths = true;
    if (hallType !== "any") query.hall_type = hallType;

    try {
      const res = await listHalls(query, session?.access_token ?? null);
      setHalls(res);
    } catch (err) {
      if (err instanceof PresenceApiError && (err.code === "endpoint_unavailable" || err.code === "network_error")) {
        setHalls({ items: [], total: 0, live_count: 0, scheduled_count: 0 });
      } else {
        setError(err instanceof Error ? err.message : "Could not load Halls.");
        setHalls({ items: [], total: 0, live_count: 0, scheduled_count: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [filter, hallType]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = halls?.items ?? [];
  const live = items.filter((h) => h.status === "live");
  const upcoming = items.filter((h) => h.status === "scheduled");
  const ended = items.filter((h) => h.status === "ended");

  return (
    <HallShell eyebrow="Halls · Index">
      <section className="presence-section">
        <PresenceEyebrow onStage>Halls</PresenceEyebrow>
        <h1
          className="presence-display"
          style={{ fontSize: "clamp(40px, 6vw, 80px)", margin: "14px 0 16px", color: "var(--presence-on-stage)" }}
        >
          Where we <em style={{ color: "var(--halls-accent)" }}>gather</em>.
        </h1>
        <p style={{ maxWidth: "60ch", color: "var(--presence-on-stage-mute)", fontSize: 16, lineHeight: 1.55 }}>
          Halls are shared digital gathering spaces. A Salon. A Listening Hall. A Town Hall. A Market with Stalls.
          Each Hall is a Room's outward face when it wants to gather, not just be entered.
        </p>
        <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PresenceChip tone="halls" live={!!halls?.live_count}>{halls?.live_count ?? 0} live</PresenceChip>
          <PresenceChip tone="dark">{halls?.scheduled_count ?? 0} upcoming</PresenceChip>
          <PresenceChip tone="dark">{halls?.total ?? 0} in total</PresenceChip>
        </div>
      </section>

      <section className="presence-section" style={{ paddingTop: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            paddingBottom: 16,
            borderBottom: "1px solid var(--presence-rule-dark)",
            marginBottom: 24,
            overflowX: "auto",
          }}
        >
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="observation-type-pill"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              style={{
                color: filter === f.key ? "var(--presence-on-stage)" : "var(--presence-on-stage-mute)",
                borderColor: filter === f.key ? "var(--halls-accent)" : "var(--presence-rule-dark)",
                background: filter === f.key ? "color-mix(in oklab, var(--halls-accent) 12%, transparent)" : "transparent",
              }}
            >
              {f.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="hall-type" className="presence-eyebrow on-stage">
              Type
            </label>
            <select
              id="hall-type"
              value={hallType}
              onChange={(e) => setHallType(e.target.value as HallType | "any")}
              style={{
                fontFamily: "var(--presence-f-mono)",
                fontSize: 11,
                padding: "6px 8px",
                border: "1px solid var(--presence-rule-dark)",
                background: "transparent",
                color: "var(--presence-on-stage)",
                borderRadius: 2,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              <option value="any">Any</option>
              {Object.entries(HALL_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={28} className="animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <PresenceEmpty
            eyebrow="No Halls yet"
            title={PRESENCE_GRAPH_COPY.hallsEmpty}
            actions={
              <>
                <PresenceButton href="/observer/garden" tone="halls">
                  Find Seeds first <ArrowRight size={14} />
                </PresenceButton>
                <PresenceButton href="/gallery" variant="ghost" onStage>
                  Walk through Rooms
                </PresenceButton>
              </>
            }
          />
        )}

        {error && (
          <p
            role="status"
            style={{
              padding: 12,
              border: "1px solid color-mix(in oklab, var(--halls-accent) 40%, transparent)",
              background: "color-mix(in oklab, var(--halls-accent) 8%, transparent)",
              color: "var(--presence-on-stage)",
              borderRadius: 2,
            }}
          >
            {error}
          </p>
        )}

        {live.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <PresenceSectionHead num="01" label="Live now" title={<>Live <em style={{ color: "var(--halls-accent)" }}>now</em>.</>} blurb="Halls open at this moment. Walk in." />
            <div className="garden-grid is-wide">
              {live.map((hall) => (
                <HallCard key={hall.id} hall={hall} />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <PresenceSectionHead num="02" label="Upcoming" title="Soon." blurb="Halls scheduled to open. Set a reminder by joining now." />
            <div className="garden-grid is-wide">
              {upcoming.map((hall) => (
                <HallCard key={hall.id} hall={hall} />
              ))}
            </div>
          </div>
        )}

        {ended.length > 0 && (
          <div>
            <PresenceSectionHead num="03" label="Recent" title="Recently gathered." blurb="Halls that finished. Notice what was said." />
            <div className="garden-grid">
              {ended.map((hall) => (
                <HallCard key={hall.id} hall={hall} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="presence-section" style={{ paddingTop: 0 }}>
        <div
          className="presence-card is-dark"
          style={{
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "var(--presence-stage-2)",
          }}
        >
          <PresenceEyebrow onStage>Host a Hall</PresenceEyebrow>
          <p className="presence-display" style={{ margin: 0, fontSize: "clamp(24px, 3vw, 36px)", color: "var(--presence-on-stage)" }}>
            Your Room can <em style={{ color: "var(--halls-accent)" }}>open into a Hall</em>.
          </p>
          <p style={{ margin: 0, color: "var(--presence-on-stage-mute)", lineHeight: 1.55, maxWidth: "60ch" }}>
            Halls are where your Room gathers people. Open the Studio for your Room and create one — Town Hall,
            Market Hall, Salon, Listening Hall, Studio Hall, Afterparty.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/studio" className="presence-btn on-stage">
              Open Studio <ArrowRight size={14} />
            </Link>
            <Link href="/world" className="presence-btn on-stage is-ghost">
              World
            </Link>
          </div>
        </div>
      </section>
    </HallShell>
  );
}
