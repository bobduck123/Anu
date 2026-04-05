"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Leaf, MapPinned, Trees, Wrench } from "lucide-react";
import {
  educationStackApi,
  PlantFilterOptions,
  PlantKnowledgeEntry,
  SceneDefinition,
  SensitivityLevel,
} from "@/lib/api/educationStack";

type SceneIconKey = "digital_bush_walk" | "seasonal_knowledge_map" | "cultural_camp_scene" | "toolmakers_table";

const SCENE_ICONS: Record<SceneIconKey, typeof Leaf> = {
  digital_bush_walk: Leaf,
  seasonal_knowledge_map: MapPinned,
  cultural_camp_scene: Trees,
  toolmakers_table: Wrench,
};

const PLANT_POSITIONS = [
  { left: "6%", top: "56%" },
  { left: "24%", top: "24%" },
  { left: "41%", top: "60%" },
  { left: "58%", top: "28%" },
  { left: "74%", top: "62%" },
  { left: "86%", top: "36%" },
];

const SENSITIVITY_LABELS: Record<SensitivityLevel, string> = {
  public: "Public",
  community: "Community",
  restricted: "Restricted",
};

export function ImmersiveLayerView() {
  const reduceMotion = useReducedMotion();
  const [scenes, setScenes] = useState<SceneDefinition[]>([]);
  const [plants, setPlants] = useState<PlantKnowledgeEntry[]>([]);
  const [filters, setFilters] = useState<PlantFilterOptions | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedPlant, setSelectedPlant] = useState<PlantKnowledgeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const displayedPlants = useMemo(() => plants.slice(0, 6), [plants]);

  useEffect(() => {
    const fetchScenes = async () => {
      try {
        const response = await educationStackApi.listScenes();
        setScenes(response.scenes);
      } catch {
        setScenes([]);
      }
    };
    fetchScenes();
  }, []);

  useEffect(() => {
    const fetchPlants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await educationStackApi.listPlants({
          region: selectedRegion || undefined,
          season: selectedSeason || undefined,
        });
        setPlants(response.plants);
        setFilters(response.filters);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load immersive plant knowledge.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlants();
  }, [selectedRegion, selectedSeason]);

  useEffect(() => {
    if (!selectedPlant) {
      return;
    }
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPlant(null);
      }
      if (event.key !== "Tab") {
        return;
      }
      const root = modalRef.current;
      if (!root) {
        return;
      }
      const focusable = root.querySelectorAll<HTMLElement>(
        "button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])",
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      activeElement?.focus();
    };
  }, [selectedPlant]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Immersive Knowledge Layer
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Digital bush walk, seasonal knowledge mapping, cultural camp perspective, and toolmakers table context.
          </p>
        </header>

        <section className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                Region
                <select
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-foreground)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  value={selectedRegion}
                  onChange={(event) => setSelectedRegion(event.target.value)}
                >
                  <option value="">All Regions</option>
                  {(filters?.regions || []).map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                Season
                <select
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-foreground)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  value={selectedSeason}
                  onChange={(event) => setSelectedSeason(event.target.value)}
                >
                  <option value="">All Seasons</option>
                  {(filters?.seasons || []).map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Knowledge entries: {plants.length}</p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          {scenes.map((scene) => {
            const Icon = SCENE_ICONS[scene.id as SceneIconKey] || Leaf;
            return (
              <article key={scene.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-institutional)]" />
                  <h2 className="text-lg font-semibold">{scene.title}</h2>
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">{scene.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scene.supports.map((support) => (
                    <span key={support} className="rounded-full bg-[var(--color-sage-light)] px-2 py-1 text-[11px] text-[var(--color-forest)]">
                      {support.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-b from-[#f6d4cb] via-[#f6d4cb] to-[#f6d4cb] p-4 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Digital Bush Walk
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading plant knowledge scene...</p>
          ) : error ? (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          ) : displayedPlants.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No plant entries available for this filter combination.</p>
          ) : (
            <div className="relative h-[28rem] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[radial-gradient(circle_at_20%_20%,#ffffff_0%,#f0eee8_45%,#ece8df_100%)]">
              {displayedPlants.map((plant, index) => {
                const media = plant.media_assets.find((item) => item.is_transparent_illustration) || plant.media_assets[0];
                const position = PLANT_POSITIONS[index] || PLANT_POSITIONS[PLANT_POSITIONS.length - 1];
                return (
                  <motion.button
                    key={plant.id}
                    type="button"
                    className="group absolute w-32 rounded-lg border border-[var(--color-border)] bg-[color:rgba(246,212,203,0.88)] p-2 text-left shadow-sm backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-institutional)]"
                    style={{ left: position.left, top: position.top }}
                    onClick={() => setSelectedPlant(plant)}
                    initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={reduceMotion ? undefined : { duration: 0.24, ease: "easeOut", delay: index * 0.05 }}
                  >
                    {media ? (
                      <div className="relative mb-2 h-16 w-full">
                        <Image
                          src={media.asset_url}
                          alt={media.alt_text || `${plant.indigenous_name} illustration`}
                          fill
                          unoptimized
                          sizes="128px"
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="mb-2 h-16 rounded bg-[var(--color-muted)]" />
                    )}
                    <p className="truncate text-xs font-semibold text-[var(--color-earth-dark)]">{plant.indigenous_name}</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">{plant.season}</p>
                    <span className="mt-1 inline-block rounded-full bg-[var(--color-institutional-light)] px-2 py-0.5 text-[10px] text-[var(--color-institutional)]">
                      {SENSITIVITY_LABELS[plant.sensitivity_level]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedPlant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[color:rgba(30,2,39,0.45)] p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPlant(null);
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plant-modal-title"
            aria-describedby="plant-modal-description"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--color-foreground)] p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 id="plant-modal-title" className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
                  {selectedPlant.indigenous_name}
                </h3>
                <p id="plant-modal-description" className="text-sm text-[var(--color-muted-foreground)]">
                  {selectedPlant.region} | {selectedPlant.language_group} | {selectedPlant.season}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
                onClick={() => setSelectedPlant(null)}
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Traditional Uses</p>
                <p className="text-sm">{selectedPlant.traditional_uses}</p>
              </article>
              <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Preparation Methods</p>
                <p className="text-sm">{selectedPlant.preparation_methods || "No preparation method metadata available."}</p>
              </article>
              <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4 md:col-span-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Cultural Context</p>
                <p className="text-sm">{selectedPlant.cultural_context || "No cultural context metadata available."}</p>
              </article>
              <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4 md:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Ecological Relationships</p>
                <div className="space-y-2">
                  {selectedPlant.ecological_relationships.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No ecological links recorded yet.</p>
                  ) : (
                    selectedPlant.ecological_relationships.map((relation) => (
                      <div key={relation.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-foreground)] p-3">
                        <p className="text-xs font-semibold text-[var(--color-institutional)]">{relation.relationship_type.replaceAll("_", " ")}</p>
                        <p className="text-sm text-[var(--color-earth-dark)]">
                          {relation.related_plant_name || relation.related_label || "Linked species"}
                        </p>
                        {relation.ethical_harvest_constraint && (
                          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{relation.ethical_harvest_constraint}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
