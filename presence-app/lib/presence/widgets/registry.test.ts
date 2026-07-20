import test from "node:test";
import assert from "node:assert/strict";
import { listWidgetsForPilot, widgetAllowedInScene, widgetIsLive } from "./registry.ts";

test("pilot widget library shows only live default-owner blocks", () => {
  const widgets = listWidgetsForPilot();
  assert.ok(widgets.length > 0);
  assert.ok(widgets.every((widget) => widget.support === "live" && widget.pilotVisibility === "pilot"));
  assert.equal(widgets.some((widget) => widget.type === "divider"), false);
  assert.equal(widgets.some((widget) => widget.type === "roomkey-chip"), false);
});

test("widget scene boundaries remain constrained", () => {
  assert.equal(widgetIsLive("work-wall"), true);
  assert.equal(widgetAllowedInScene("work-wall", "wall"), true);
  assert.equal(widgetAllowedInScene("work-wall", "field"), false);
});
