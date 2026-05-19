// Audio registry tests — Pass 5.
//
// Pure logic check: registering iframes, switching chambers blanks the
// outgoing iframe and restores the incoming iframe's original src.
// Run with: npx tsx lib/presence/world/audioRegistry.test.ts

import assert from "node:assert/strict";

import {
  register,
  unregister,
  pauseAll,
  setActiveChamber,
  _debugSize,
  _debugActiveChamber,
  _resetForTests,
} from "./audioRegistry";

interface FakeContentWindow { postMessage(msg: unknown, target: string): void; }
interface FakeIframe { src: string; contentWindow: FakeContentWindow; }

function makeIframe(src: string): FakeIframe {
  const messages: unknown[] = [];
  return {
    src,
    contentWindow: {
      postMessage(msg: unknown) { messages.push(msg); },
    },
  };
}

let passed = 0;
function it(name: string, fn: () => void) {
  _resetForTests();
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("\nAudio registry:\n");

it("starts empty with no active chamber", () => {
  assert.equal(_debugSize(), 0);
  assert.equal(_debugActiveChamber(), null);
});

it("register adds an entry", () => {
  const f = makeIframe("https://soundcloud.com/x");
  register("a-1", "booth", f as unknown as HTMLIFrameElement, f.src);
  assert.equal(_debugSize(), 1);
});

it("unregister removes an entry", () => {
  const f = makeIframe("https://soundcloud.com/x");
  register("a-1", "booth", f as unknown as HTMLIFrameElement, f.src);
  unregister("a-1");
  assert.equal(_debugSize(), 0);
});

it("setActiveChamber blanks outgoing iframes and restores incoming", () => {
  const boothFrame = makeIframe("https://soundcloud.com/booth-set");
  const galleryFrame = makeIframe("https://soundcloud.com/gallery-set");
  register("booth-1", "booth", boothFrame as unknown as HTMLIFrameElement, boothFrame.src);
  register("gallery-1", "signal-wall", galleryFrame as unknown as HTMLIFrameElement, galleryFrame.src);

  // Activate the booth: gallery iframe is irrelevant (different chamber).
  setActiveChamber("booth");
  assert.equal(boothFrame.src, "https://soundcloud.com/booth-set", "booth iframe should keep its src on entry");
  assert.equal(_debugActiveChamber(), "booth");

  // Move to signal-wall: booth iframe should be blanked, gallery untouched (already on its src).
  setActiveChamber("signal-wall");
  assert.equal(boothFrame.src, "about:blank", "booth iframe should be blanked on leaving");
  assert.equal(galleryFrame.src, "https://soundcloud.com/gallery-set");
  assert.equal(_debugActiveChamber(), "signal-wall");

  // Return to booth: the booth iframe should be restored.
  setActiveChamber("booth");
  assert.equal(boothFrame.src, "https://soundcloud.com/booth-set", "booth iframe should restore on re-entry");
});

it("only one chamber-worth of audio is active at a time", () => {
  const a = makeIframe("https://soundcloud.com/a");
  const b = makeIframe("https://soundcloud.com/b");
  register("a", "booth", a as unknown as HTMLIFrameElement, a.src);
  register("b", "archive", b as unknown as HTMLIFrameElement, b.src);
  setActiveChamber("booth");
  setActiveChamber("archive");
  assert.equal(a.src, "about:blank");
  assert.equal(b.src, "https://soundcloud.com/b");
});

it("pauseAll blanks every registered iframe", () => {
  const a = makeIframe("https://soundcloud.com/a");
  const b = makeIframe("https://soundcloud.com/b");
  register("a", "x", a as unknown as HTMLIFrameElement, a.src);
  register("b", "y", b as unknown as HTMLIFrameElement, b.src);
  pauseAll();
  assert.equal(a.src, "about:blank");
  assert.equal(b.src, "about:blank");
});

it("setActiveChamber with the same id is a no-op", () => {
  const a = makeIframe("https://soundcloud.com/a");
  register("a", "x", a as unknown as HTMLIFrameElement, a.src);
  setActiveChamber("x");
  // Switch to same id: source must not change
  setActiveChamber("x");
  assert.equal(a.src, "https://soundcloud.com/a");
});

console.log(`\n${passed} audio registry tests passed ✓\n`);
