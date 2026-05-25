import assert from "node:assert/strict";
import test from "node:test";
import { MAX_EDITOR_IMAGE_BYTES, validateMediaUploadFile } from "./mediaValidation.ts";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

test("editor upload policy accepts supported image signatures", async () => {
  assert.equal(await validateMediaUploadFile(new File([png], "cover.png", { type: "image/png" })), null);
  assert.equal(await validateMediaUploadFile(new File([jpg], "cover.jpg", { type: "image/jpeg" })), null);
  assert.equal(await validateMediaUploadFile(new File([webp], "cover.webp", { type: "image/webp" })), null);
});

test("editor upload policy blocks unsafe types and type mismatches", async () => {
  assert.match(
    (await validateMediaUploadFile(new File(["<svg></svg>"], "drawing.svg", { type: "image/svg+xml" }))) ?? "",
    /JPG, PNG, or WEBP/,
  );
  assert.match(
    (await validateMediaUploadFile(new File([png], "cover.jpg", { type: "image/jpeg" }))) ?? "",
    /contents do not match/,
  );
  assert.match(
    (await validateMediaUploadFile(new File([png], "cover.jpg", { type: "image/png" }))) ?? "",
    /file name and image type/,
  );
});

test("editor upload policy blocks oversized files", async () => {
  const large = new File([jpg, new Uint8Array(MAX_EDITOR_IMAGE_BYTES)], "large.jpg", { type: "image/jpeg" });
  assert.match((await validateMediaUploadFile(large)) ?? "", /under 8 MB/);
});
