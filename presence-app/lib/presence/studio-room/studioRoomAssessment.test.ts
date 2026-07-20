import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRoomRenderer } from "../../../components/presence-studio/StudioRoomRenderer.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import { studioRoomFromPresenceNode } from "./adapters/fromEditableConfig.ts";
import {
  assessStudioRoomFixtures,
  listStudioRoomAssessmentInputs,
  studioRoomAssessmentToMarkdown,
} from "./assessment.ts";
import { isStudioRoomInternalPreviewEnabled } from "./previewGate.ts";
import { renderStudioRoom } from "./renderer.ts";
import { toPublicRoomPayload } from "./sanitize.ts";

test("Studio Room assessment discovers representative existing local room sources", () => {
  const inputs = listStudioRoomAssessmentInputs();
  assert.ok(inputs.length >= 3);
  assert.ok(inputs.some((input) => input.sourceKind === "demo-profile"));
  assert.ok(inputs.some((input) => input.id.includes("ggm-christina-goddard")));
});

test("each assessed existing room adapts, sanitizes, and renders without crashing", () => {
  const inputs = listStudioRoomAssessmentInputs();

  for (const input of inputs) {
    const room = studioRoomFromPresenceNode(input.node, {
      mode: "draft",
      roomState: "draft",
    });
    const payload = toPublicRoomPayload(room);
    assert.deepEqual(findRestrictedPublicPayloadKeys(payload), [], input.id);

    const tree = renderStudioRoom(payload, { viewport: "mobile" });
    assert.ok(tree.title.length > 0, input.id);

    const html = renderToStaticMarkup(
      createElement(StudioRoomRenderer, { room, viewport: "mobile" }),
    );
    assert.match(html, /studio-room/);
    assert.equal(html.includes("editable_config"), false, input.id);
    assert.equal(html.includes("asset_config"), false, input.id);
    assert.equal(html.includes("content_config"), false, input.id);
    assert.equal(html.includes("style_dna"), false, input.id);
    assert.equal(html.includes("motion_config"), false, input.id);
  }
});

test("assessment report captures adapter gaps and template candidates", () => {
  const report = assessStudioRoomFixtures();
  assert.ok(report.assessedRoomCount >= 3);
  assert.equal(report.aggregate.payloadHygieneFailCount, 0);
  assert.equal(report.aggregate.semanticCoverage["services"].mapped, 7);
  assert.equal(report.aggregate.semanticCoverage["proof/testimonials"].mapped, 7);
  assert.equal(report.aggregate.semanticCoverage["contact methods"].mapped, 7);
  assert.equal(report.aggregate.semanticCoverage["media embeds"].deferred, 1);
  assert.ok(Object.keys(report.aggregate.commonSourceAbsentFields).length > 0);
  assert.ok(
    report.aggregate.strongTemplateCandidates.length +
      report.aggregate.candidateTemplateCandidates.length >
      0,
  );

  const markdown = studioRoomAssessmentToMarkdown(report);
  assert.match(markdown, /Presence Studio Room Assessment/);
  assert.match(markdown, /Room Detail Map/);
  assert.match(markdown, /Prioritized Gap Map/);
  assert.match(markdown, /Defaulted Fields Note/);
});

test("assessment remains preview-only: the internal preview gate defaults closed in production", () => {
  assert.equal(isStudioRoomInternalPreviewEnabled({ NODE_ENV: "production" }), false);
});
