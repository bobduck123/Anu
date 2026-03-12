"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  educationStackApi,
  HarvestSimulationResult,
  PlantLandscapeState,
  RelationshipGraphEdge,
  RelationshipGraphNode,
} from "@/lib/api/educationStack";

const STATUS_THEME: Record<HarvestSimulationResult["status"], { label: string; color: string; bg: string }> = {
  sustainable: {
    label: "Sustainable",
    color: "text-[var(--color-forest)]",
    bg: "bg-[var(--color-sage-light)]",
  },
  caution: {
    label: "Caution",
    color: "text-[#8a5b00]",
    bg: "bg-[var(--color-accent-light)]",
  },
  unsustainable: {
    label: "Unsustainable",
    color: "text-[var(--color-danger)]",
    bg: "bg-[var(--color-danger-light)]",
  },
};

type PositionedNode = RelationshipGraphNode & { x: number; y: number };

export function SystemsLayerView() {
  const reduceMotion = useReducedMotion();
  const [nodes, setNodes] = useState<RelationshipGraphNode[]>([]);
  const [edges, setEdges] = useState<RelationshipGraphEdge[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null);
  const [landscapeStates, setLandscapeStates] = useState<PlantLandscapeState[]>([]);
  const [selectedLandscape, setSelectedLandscape] = useState<PlantLandscapeState["state_label"]>("before");
  const [harvestPercent, setHarvestPercent] = useState(25);
  const [harvestMethod, setHarvestMethod] = useState("selective");
  const [harvestSeason, setHarvestSeason] = useState("");
  const [simulationResult, setSimulationResult] = useState<HarvestSimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const loadGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const graph = await educationStackApi.getGraph();
        setNodes(graph.nodes);
        setEdges(graph.edges);
        if (graph.nodes.length > 0) {
          setSelectedPlantId(graph.nodes[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load systems graph.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    loadGraph();
  }, []);

  useEffect(() => {
    if (!selectedPlantId) {
      return;
    }
    const loadLandscape = async () => {
      try {
        const response = await educationStackApi.getLandscapeStates(selectedPlantId);
        setLandscapeStates(response.states);
        if (response.states.length > 0) {
          setSelectedLandscape(response.states[0].state_label);
        }
      } catch {
        setLandscapeStates([]);
      }
    };
    loadLandscape();
  }, [selectedPlantId]);

  const positionedNodes = useMemo<PositionedNode[]>(() => {
    if (nodes.length === 0) {
      return [];
    }
    const cx = 300;
    const cy = 180;
    const radius = Math.max(90, Math.min(140, 30 + nodes.length * 14));
    return nodes.map((node, index) => {
      const theta = (index / nodes.length) * Math.PI * 2;
      return {
        ...node,
        x: cx + Math.cos(theta) * radius,
        y: cy + Math.sin(theta) * radius,
      };
    });
  }, [nodes]);

  const nodeLookup = useMemo(
    () =>
      positionedNodes.reduce<Record<number, PositionedNode>>((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {}),
    [positionedNodes],
  );

  const activeLandscape = useMemo(
    () => landscapeStates.find((state) => state.state_label === selectedLandscape) || null,
    [landscapeStates, selectedLandscape],
  );

  const runSimulation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlantId) {
      return;
    }
    setSimulating(true);
    try {
      const result = await educationStackApi.runHarvestSimulation({
        plant_id: selectedPlantId,
        harvest_percent: harvestPercent,
        method: harvestMethod,
        season: harvestSeason || undefined,
      });
      setSimulationResult(result);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Systems Literacy Layer
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Relational ecological modeling, harvest ethics simulation, and temporal landscape state transitions.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          {loading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading relationship graph...</p>
          ) : error ? (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          ) : positionedNodes.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No graph data is available yet.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="text-xs text-[var(--color-muted-foreground)]">
                  Focus plant
                  <select
                    value={selectedPlantId ?? ""}
                    onChange={(event) => setSelectedPlantId(Number(event.target.value))}
                    className="ml-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)]"
                  >
                    {positionedNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[#f8f5ef] p-2">
                <svg viewBox="0 0 600 360" className="h-[22rem] w-full" role="img" aria-label="Plant relationship graph">
                  {edges
                    .filter((edge) => edge.target && nodeLookup[edge.source] && nodeLookup[edge.target])
                    .map((edge) => {
                      const source = nodeLookup[edge.source];
                      const target = edge.target ? nodeLookup[edge.target] : null;
                      if (!source || !target) {
                        return null;
                      }
                      return (
                        <line
                          key={edge.id}
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="#9a8e7e"
                          strokeWidth={1.4}
                          strokeDasharray={edge.type === "harvest_constraint" ? "4 4" : undefined}
                        />
                      );
                    })}
                  {positionedNodes.map((node) => (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                      <circle
                        r={node.id === selectedPlantId ? 24 : 18}
                        fill={node.id === selectedPlantId ? "#2d5a3d" : "#e6ddd0"}
                        stroke="#2c241b"
                        strokeWidth={1}
                      />
                      <text
                        x={0}
                        y={node.id === selectedPlantId ? 40 : 34}
                        textAnchor="middle"
                        className="fill-[var(--color-earth-dark)] text-[11px]"
                      >
                        {node.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </>
          )}
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Harvest Ethics Simulator
            </h2>
            <form onSubmit={runSimulation} className="space-y-4">
              <label className="block text-xs text-[var(--color-muted-foreground)]">
                Harvest Percentage
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={harvestPercent}
                  onChange={(event) => setHarvestPercent(Number(event.target.value))}
                  className="mt-2 w-full"
                />
                <span className="mt-1 inline-block text-sm text-[var(--color-earth-dark)]">{harvestPercent}%</span>
              </label>
              <label className="block text-xs text-[var(--color-muted-foreground)]">
                Harvest Method
                <select
                  value={harvestMethod}
                  onChange={(event) => setHarvestMethod(event.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)]"
                >
                  <option value="selective">Selective clipping</option>
                  <option value="whole_plant">Whole plant extraction</option>
                  <option value="root_pull">Root pull</option>
                  <option value="strip_bark">Bark stripping</option>
                </select>
              </label>
              <label className="block text-xs text-[var(--color-muted-foreground)]">
                Seasonal Context
                <input
                  type="text"
                  value={harvestSeason}
                  onChange={(event) => setHarvestSeason(event.target.value)}
                  placeholder="e.g., summer"
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)]"
                />
              </label>
              <button type="submit" disabled={simulating || !selectedPlantId} className="btn-pill btn-pill-primary text-sm disabled:opacity-60">
                {simulating ? "Simulating..." : "Run Ethics Simulation"}
              </button>
            </form>

            <AnimatePresence mode="wait">
              {simulationResult && (
                <motion.div
                  key={simulationResult.status}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={reduceMotion ? undefined : { duration: 0.24, ease: "easeOut" }}
                  className={`mt-5 rounded-lg border border-[var(--color-border)] p-4 ${STATUS_THEME[simulationResult.status].bg}`}
                >
                  <p className={`text-sm font-semibold ${STATUS_THEME[simulationResult.status].color}`}>
                    {STATUS_THEME[simulationResult.status].label} | Risk {simulationResult.risk_score.toFixed(1)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-earth-dark)]">{simulationResult.indigenous_name}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--color-muted-foreground)]">
                    {simulationResult.guidance.map((note, index) => (
                      <li key={`${note}-${index}`}>- {note}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </article>

          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Temporal Landscape
            </h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {landscapeStates.map((state) => (
                <button
                  key={state.state_label}
                  type="button"
                  onClick={() => setSelectedLandscape(state.state_label)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedLandscape === state.state_label
                      ? "bg-[var(--color-institutional)] text-white"
                      : "bg-[var(--color-muted)] text-[var(--color-earth-dark)]"
                  }`}
                >
                  {state.state_label}
                </button>
              ))}
            </div>
            {activeLandscape ? (
              <motion.div
                key={activeLandscape.state_label}
                initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={reduceMotion ? undefined : { duration: 0.24, ease: "easeOut" }}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">Biodiversity</p>
                    <p className="font-mono-data text-lg">{(activeLandscape.biodiversity_index ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">Soil Health</p>
                    <p className="font-mono-data text-lg">{(activeLandscape.soil_health_index ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">Canopy Cover</p>
                    <p className="font-mono-data text-lg">{((activeLandscape.canopy_cover_pct ?? 0) * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--color-earth-dark)]">{activeLandscape.narrative || "No narrative available."}</p>
              </motion.div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No temporal states available for this plant yet.</p>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
