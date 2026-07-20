import test from "node:test";
import assert from "node:assert/strict";
import { validateAssetUrl } from "./assetValidator.ts";

test("validateAssetUrl accepts https and root-relative public assets", () => {
  assert.equal(validateAssetUrl("https://cdn.example.com/work.webp").isValid, true);
  assert.equal(validateAssetUrl("/ggm/works/work.webp").isValid, true);
});

test("validateAssetUrl blocks local paths, internal hosts, script payloads, and raw tokens", () => {
  for (const value of [
    "file://blocked-private-image.png",
    "Z:\\blocked\\private.png",
    "https://localhost/image.png",
    "http://127.0.0.1:5000/image.png",
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "https://cdn.example.com/image.png?token=secret",
    "/assets/../private.png",
  ]) {
    assert.equal(validateAssetUrl(value).isValid, false, value);
  }
});

test("validateAssetUrl warns for signed image CDN links without blocking them", () => {
  const result = validateAssetUrl("https://images.cloudfront.net/room/hero.webp?X-Amz-Signature=abc123&X-Amz-Expires=600");
  assert.equal(result.isValid, true);
  assert.equal(result.warnings.some((warning) => warning.includes("may expire")), true);
});

test("validateAssetUrl still blocks actual secret parameters on signed CDN hosts", () => {
  const result = validateAssetUrl("https://images.cloudfront.net/room/hero.webp?X-Amz-Signature=abc123&access_token=private");
  assert.equal(result.isValid, false);
  assert.equal(result.errors.some((error) => error.includes("raw secrets")), true);
});
