// audioRegistry — Pass 5.
//
// Tracks active audio iframes per chamber and stops them when the
// chamber changes. Third-party embeds (SoundCloud, YouTube, Vimeo,
// Spotify) cannot be paused programmatically without their own player
// API, so the safe-pause strategy is to BLANK the iframe src — this
// stops audio decisively. The chamber-change handler also replays the
// iframe when the original chamber is revisited.
//
// Limitations (documented in the report):
// - Spotify embeds don't expose a JS pause API to cross-origin pages
//   either; blanking src is the only universal mute.
// - When the user re-visits a chamber, the audio iframe re-mounts from
//   scratch — playback position is lost. This is the same constraint
//   that affects native audio when its element is removed from the DOM.
// - We don't intercept user-side autoplay; we just stop iframes when
//   the user leaves the chamber that contains them.

interface RegisteredAudio {
  id: string;
  chamberId: string;
  iframe: HTMLIFrameElement;
  originalSrc: string;
}

const registry = new Map<string, RegisteredAudio>();
let activeChamberId: string | null = null;

export function setActiveChamber(id: string) {
  if (id === activeChamberId) return;
  // Pause any iframe whose chamber is leaving
  if (activeChamberId !== null) {
    for (const entry of registry.values()) {
      if (entry.chamberId === activeChamberId) {
        try {
          // Send postMessage pause first — works for YouTube/Vimeo when
          // their API is enabled; harmless when not.
          const win = entry.iframe.contentWindow;
          if (win) {
            // YouTube
            win.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
            // Vimeo
            win.postMessage(JSON.stringify({ method: "pause" }), "*");
            // SoundCloud
            win.postMessage(JSON.stringify({ method: "pause", value: [] }), "*");
            // Spotify embed (best effort)
            win.postMessage({ command: "pause" }, "*");
          }
        } catch {
          // ignore — cross-origin restrictions
        }
        // As a hard mute fallback, blank the iframe src. This guarantees
        // audio stops even when the embed doesn't speak our pause API.
        try {
          entry.iframe.src = "about:blank";
        } catch {
          // ignore
        }
      }
    }
  }
  activeChamberId = id;
  // Re-arm any iframes that belong to the now-active chamber.
  for (const entry of registry.values()) {
    if (entry.chamberId === id && entry.iframe.src !== entry.originalSrc) {
      try {
        entry.iframe.src = entry.originalSrc;
      } catch {
        // ignore
      }
    }
  }
}

export function register(id: string, chamberId: string, iframe: HTMLIFrameElement, originalSrc: string) {
  registry.set(id, { id, chamberId, iframe, originalSrc });
}

export function unregister(id: string) {
  registry.delete(id);
}

export function pauseAll() {
  for (const entry of registry.values()) {
    try {
      entry.iframe.src = "about:blank";
    } catch {
      // ignore
    }
  }
}

/** For tests / debugging. */
export function _debugSize(): number {
  return registry.size;
}

export function _debugActiveChamber(): string | null {
  return activeChamberId;
}

/** Test seam — resets the registry. */
export function _resetForTests() {
  registry.clear();
  activeChamberId = null;
}
