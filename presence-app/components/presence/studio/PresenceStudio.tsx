"use client";

// PresenceStudio — the production onboarding shell.
//
// Quick path: Welcome → Identity → Worlds → Movement → Mood & Material → Submit
// Deep refinement (Pace, Contact, Tone, References) is optional, inline
// on the Submit step.
//
// Layout:
// - Desktop: 3-column rail / stage / live preview
// - Mobile: stage + sticky mobile preview drawer + bottom action bar

import { useEffect, useState } from "react";
import type { SetupRequestResult } from "@/lib/presence/studio/adapter";
import { useStudioState } from "@/lib/presence/studio/useStudioState";
import {
  StepEnter,
  StepIdentity,
  StepMoodMaterial,
  StepMovement,
  StepWorlds,
} from "./steps";
import StepSubmit from "./StepSubmit";
import SubmissionConfirmation from "./SubmissionConfirmation";
import MobilePreviewDrawer from "./MobilePreviewDrawer";
import { PreviewStage, PreviewSummary } from "./PreviewStage";

interface QuickStage {
  id: "enter" | "identity" | "worlds" | "movement" | "moodmat" | "submit";
  key: string;
  title: string;
  sub: string;
}

const QUICK_STAGES: QuickStage[] = [
  { id: "enter",    key: "Welcome",   title: "Welcome",                 sub: "Step into the studio." },
  { id: "identity", key: "Practice",  title: "What kind of practice",   sub: "Pick the closest fit." },
  { id: "worlds",   key: "Place",     title: "The place itself",        sub: "Choose the space visitors enter." },
  { id: "movement", key: "Movement",  title: "How they move",            sub: "Walk · orbit · approach · open." },
  { id: "moodmat",  key: "Mood",      title: "Mood & material",          sub: "Light and what things are made of." },
  { id: "submit",   key: "Submit",    title: "Preview & send",           sub: "Send the setup request." },
];

export default function PresenceStudio() {
  const studio = useStudioState();
  const [stepIdx, setStepIdx] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [submitResult, setSubmitResult] = useState<SetupRequestResult | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const step = QUICK_STAGES[stepIdx];

  const stepSatisfied: Record<QuickStage["id"], boolean> = {
    enter: true,
    identity: !!studio.selection.identityId,
    worlds: !!studio.selection.worldId,
    movement: !!studio.selection.movementId,
    moodmat: !!studio.selection.moodId && !!studio.selection.materialId,
    submit: true,
  };

  const goNext = () => setStepIdx((i) => Math.min(QUICK_STAGES.length - 1, i + 1));
  const goPrev = () => setStepIdx((i) => Math.max(0, i - 1));

  function selLabel(stageId: QuickStage["id"]): string | null {
    switch (stageId) {
      case "identity": return studio.resolved.identity?.label ?? null;
      case "worlds":   return studio.resolved.world?.label ?? null;
      case "movement": return studio.resolved.movement?.label ?? null;
      case "moodmat":  {
        const m = studio.resolved.mood?.label;
        const x = studio.resolved.material?.label;
        return m && x ? `${m} · ${x}` : null;
      }
      default: return null;
    }
  }

  if (submitResult && submitResult.state !== "validation_error") {
    return (
      <SubmissionConfirmation
        result={submitResult}
        resolved={studio.resolved}
        onReset={() => {
          setSubmitResult(null);
          studio.reset();
          setStepIdx(0);
        }}
      />
    );
  }

  return (
    <div className="presence-studio-shell" data-source={studio.manifest.source}>
      <div className="presence-studio-frame">
        {!isMobile && (
          <aside className="presence-studio-rail" aria-label="Studio progress">
            <header className="rail-head">
              <p className="rail-eyebrow">Presence Studio</p>
              <p className="rail-title">Set the direction</p>
              <p className="rail-sub">Five stages. Ten to fifteen minutes. Nothing is published until you say so.</p>
            </header>
            <hr className="rail-rule" />
            <ol className="rail-list">
              {QUICK_STAGES.map((s, i) => {
                const state = i === stepIdx ? "current" : i < stepIdx ? "done" : "pending";
                const subOrDone = state === "done" ? selLabel(s.id) : (state === "current" ? s.sub : null);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="rail-step"
                      data-state={state}
                      onClick={() => i <= stepIdx + 1 && setStepIdx(i)}
                      aria-current={state === "current" ? "true" : undefined}
                    >
                      <span className="rail-num">{state === "done" ? "✓" : i === 0 ? "•" : String(i).padStart(2, "0")}</span>
                      <span className="rail-meta">
                        <span className="rail-k">Stage · {s.key}</span>
                        <span className="rail-v">{s.title}</span>
                        {subOrDone && <span className="rail-sub-row">{subOrDone}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <hr className="rail-rule" />
            <p className="rail-foot-k">Save state · this device</p>
            <p className="rail-foot-v">Saved here. Submit when you&apos;re ready.</p>
          </aside>
        )}

        <main className="presence-studio-stage" data-step={step.id}>
          {isMobile && step.id !== "enter" && (
            <nav className="presence-studio-chips" role="tablist" aria-label="Studio stages">
              {QUICK_STAGES.map((s, i) => {
                const state = i === stepIdx ? "current" : i < stepIdx ? "done" : "pending";
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={state === "current"}
                    data-state={state}
                    onClick={() => i <= stepIdx + 1 && setStepIdx(i)}
                  >
                    <span className="chip-num">{i === 0 ? "•" : String(i).padStart(2, "0")}</span>
                    <span className="chip-label">{s.key}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {step.id === "enter"    && <StepEnter onBegin={() => setStepIdx(1)} />}
          {step.id === "identity" && <StepIdentity manifest={studio.manifest} value={studio.selection.identityId} onChange={studio.setIdentity} />}
          {step.id === "worlds"   && <StepWorlds manifest={studio.manifest} identity={studio.resolved.identity} value={studio.selection.worldId} onChange={studio.setWorld} />}
          {step.id === "movement" && <StepMovement manifest={studio.manifest} world={studio.resolved.world} value={studio.selection.movementId} onChange={studio.setMovement} />}
          {step.id === "moodmat"  && (
            <StepMoodMaterial
              manifest={studio.manifest}
              moodValue={studio.selection.moodId}
              materialValue={studio.selection.materialId}
              onMood={studio.setMood}
              onMaterial={studio.setMaterial}
            />
          )}
          {step.id === "submit"   && (
            <StepSubmit
              manifest={studio.manifest}
              resolved={studio.resolved}
              refineOpen={studio.refineOpen}
              onToggleRefine={() => studio.setRefineOpen(!studio.refineOpen)}
              onPace={studio.setPace}
              onContact={studio.setContact}
              onTone={studio.setTone}
              onSubmitted={setSubmitResult}
            />
          )}

          {step.id !== "enter" && step.id !== "submit" && (
            <nav className="presence-studio-step-nav" aria-label="Step navigation">
              <button type="button" className="studio-btn studio-btn-ghost" onClick={goPrev} disabled={stepIdx === 0}>← Back</button>
              <span className="step-meta">Step {stepIdx} / {QUICK_STAGES.length - 1}</span>
              <button
                type="button"
                className="studio-btn studio-btn-primary"
                onClick={goNext}
                disabled={!stepSatisfied[step.id]}
              >
                Continue →
              </button>
            </nav>
          )}
        </main>

        {!isMobile && (
          <aside className="presence-studio-preview" aria-label="Live preview" aria-live="polite">
            <header className="preview-head">
              <p className="preview-eyebrow">Live preview</p>
              <span className="studio-chip studio-chip-accent">● updates as you choose</span>
            </header>
            <PreviewStage resolved={studio.resolved} />
            <PreviewSummary resolved={studio.resolved} />
          </aside>
        )}
      </div>

      {isMobile && step.id !== "enter" && (
        <MobilePreviewDrawer resolved={studio.resolved} open={drawerOpen} onToggle={setDrawerOpen} />
      )}
      {isMobile && step.id !== "enter" && step.id !== "submit" && (
        <nav className="presence-studio-mobile-actions" aria-label="Step actions">
          <button type="button" className="studio-btn studio-btn-ghost" onClick={goPrev} disabled={stepIdx === 0}>← Back</button>
          <button
            type="button"
            className="studio-btn studio-btn-primary"
            onClick={goNext}
            disabled={!stepSatisfied[step.id]}
          >
            Continue →
          </button>
        </nav>
      )}
    </div>
  );
}
