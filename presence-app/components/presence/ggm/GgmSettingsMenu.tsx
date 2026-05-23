"use client";

// Owner / operator motion settings dropdown.
//
// Lives inside the GGM left rail. Toggles open via a small "Motion"
// pill. Inside, four sections: Motion / Surface / Texture / Power
// Saver. Mutates the GgmMotionContext directly; local state only.
//
// Intentionally minimal in chrome — a single paper pop-over with
// hairline rules and tabular numerals. The public visitor sees the
// trigger pill; only when they open it do they see the controls.
// (We considered hiding the trigger entirely from public visitors
// and showing it only to authenticated owners, but settling on a
// "neutral but quiet" public trigger keeps the surface simple while
// still giving operators access. If a future Studio role check is
// available, gate the trigger on it via the `visible` prop.)

import { useRef, useState, useEffect } from "react";
import { GGM_MOTION_DEFAULTS, useGgmMotion } from "./GgmMotionContext";
import styles from "./ggm.module.css";

interface GgmSettingsMenuProps {
  visible?: boolean;
}

export function GgmSettingsMenu({ visible = true }: GgmSettingsMenuProps) {
  const { settings, setSetting, reset, reducedMotion } = useGgmMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | PointerEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  if (!visible) return null;

  return (
    <div className={styles.settingsRoot} ref={panelRef}>
      <button
        type="button"
        className={`${styles.settingsTrigger} ${open ? styles.settingsTriggerOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-hover
      >
        <span aria-hidden>✱</span>
        Motion
      </button>

      {open && (
        <div className={styles.settingsPanel} role="dialog" aria-label="Motion settings">
          <header className={styles.settingsHeader}>
            <p className={styles.settingsEyebrow}>Settings</p>
            <h3 className={styles.settingsTitle}>Tune the room</h3>
            {reducedMotion && (
              <p className={styles.settingsNote}>
                Reduced-motion is on at the OS level. Power Saver is being honoured.
              </p>
            )}
          </header>

          {/* ── Motion ─────────────────────────────────────────────── */}
          <fieldset className={styles.settingsGroup}>
            <legend>Motion</legend>

            <label className={styles.settingsRow}>
              <span>Transition style</span>
              <select
                value={settings.liquidStyle}
                onChange={(e) => setSetting("liquidStyle", e.target.value as never)}
              >
                <option value="ripple">Liquid morph (ripple)</option>
                <option value="glass">Liquid morph (glass)</option>
                <option value="dissolve">Soft dissolve</option>
                <option value="cut">Reduced motion (cut)</option>
              </select>
            </label>

            <label className={styles.settingsRow}>
              <span>Liquid intensity</span>
              <Range
                min={0}
                max={1}
                step={0.05}
                value={settings.liquidIntensity}
                onChange={(v) => setSetting("liquidIntensity", v)}
              />
            </label>

            <label className={styles.settingsRow}>
              <span>Distortion scale</span>
              <Range
                min={0}
                max={1.5}
                step={0.05}
                value={settings.liquidDistortion}
                onChange={(v) => setSetting("liquidDistortion", v)}
              />
            </label>

            <label className={styles.settingsRow}>
              <span>Transition speed</span>
              <Range
                min={400}
                max={2400}
                step={50}
                value={settings.liquidDurationMs}
                onChange={(v) => setSetting("liquidDurationMs", v)}
                suffix="ms"
              />
            </label>
          </fieldset>

          {/* ── Surface ────────────────────────────────────────────── */}
          <fieldset className={styles.settingsGroup}>
            <legend>Surface</legend>

            <label className={styles.settingsRow}>
              <span>Parallax depth</span>
              <Range
                min={0}
                max={1}
                step={0.05}
                value={settings.parallaxDepth}
                onChange={(v) => setSetting("parallaxDepth", v)}
              />
            </label>

            <label className={styles.settingsRow}>
              <span>Atmosphere blur</span>
              <Range
                min={0}
                max={1}
                step={0.05}
                value={settings.blurAmount}
                onChange={(v) => setSetting("blurAmount", v)}
              />
            </label>

            <label className={styles.settingsRowToggle}>
              <span>Custom cursor</span>
              <input
                type="checkbox"
                checked={settings.customCursor}
                onChange={(e) => setSetting("customCursor", e.target.checked)}
              />
            </label>

            <label className={styles.settingsRowToggle}>
              <span>Scroll progress</span>
              <input
                type="checkbox"
                checked={settings.scrollProgress}
                onChange={(e) => setSetting("scrollProgress", e.target.checked)}
              />
            </label>
          </fieldset>

          {/* ── Texture ────────────────────────────────────────────── */}
          <fieldset className={styles.settingsGroup}>
            <legend>Texture</legend>

            <label className={styles.settingsRow}>
              <span>Dither strength</span>
              <Range
                min={0}
                max={1}
                step={0.05}
                value={settings.ditherStrength}
                onChange={(v) => setSetting("ditherStrength", v)}
              />
            </label>

            <label className={styles.settingsRow}>
              <span>Film grain</span>
              <Range
                min={0}
                max={1}
                step={0.05}
                value={settings.filmGrainStrength}
                onChange={(v) => setSetting("filmGrainStrength", v)}
              />
            </label>
          </fieldset>

          {/* ── Power Saver ────────────────────────────────────────── */}
          <fieldset className={styles.settingsGroup}>
            <legend>Power Saver</legend>
            <label className={styles.settingsRowToggle}>
              <span>Power saver mode</span>
              <input
                type="checkbox"
                checked={settings.powerSaver}
                onChange={(e) => setSetting("powerSaver", e.target.checked)}
              />
            </label>
            <p className={styles.settingsCaption}>
              When on, the liquid morph and decorative layers are disabled and
              transitions become crisp cuts.
            </p>
          </fieldset>

          <footer className={styles.settingsFooter}>
            <button
              type="button"
              className={styles.settingsResetBtn}
              onClick={reset}
              data-hover
            >
              Reset to defaults
            </button>
            <button
              type="button"
              className={styles.settingsCloseBtn}
              onClick={() => setOpen(false)}
              data-hover
            >
              Close
            </button>
          </footer>

          <p className={styles.settingsFootnote}>
            Local only — values persist on this device. Future versions will
            sync to the Room style DNA.
          </p>
        </div>
      )}
    </div>
  );
}

interface RangeProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}

function Range({ value, min, max, step, onChange, suffix }: RangeProps) {
  const display = step >= 1 ? value.toFixed(0) : value.toFixed(2);
  return (
    <span className={styles.settingsRangeWrap}>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={styles.settingsRangeReadout}>
        {display}
        {suffix ?? ""}
      </span>
    </span>
  );
}

// Keep the defaults export reachable so settings preview / tests can
// reference it without re-importing the context file.
export { GGM_MOTION_DEFAULTS };
