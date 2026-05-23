"use client";

// GgmLiquidCanvas — vanilla WebGL2 image morph between two textures.
//
// Ports the `ripple` + `glass` fragment-shader effects from the
// MIT-licensed reference at
//   C:\Dev\tools\threejs-gsap-liquid-morphology-slideshow
//
// Differences vs the reference:
//   - no Three.js dependency, no GSAP, no tweakpane.
//   - single `uProgress` uniform; React state + rAF drives the curve.
//   - only two effect modes (ripple + glass) — chosen because they read
//     as cinematic image transitions appropriate for an art portfolio.
//   - getCoverUV() preserved verbatim.
//   - falls back to a CSS crossfade when WebGL2 is unavailable, the
//     user prefers reduced motion, or the parent passes `style="cut"`.
//
// Public API:
//   <GgmLiquidCanvas
//     images={imageUrls}          // string[] — preloaded textures
//     activeIndex={0..n}           // which texture is currently "shown"
//     style="ripple" | "glass" | "dissolve" | "cut"
//     transitionMs={1100}
//     intensity={1}                // 0..1 strength multiplier
//     distortion={1}               // 0..1 amplitude multiplier
//     className={...}
//     onTransitionEnd={() => void}
//   />
//
// The component holds two textures: the currently-displayed image and
// the target. When `activeIndex` changes, it animates `uProgress` from
// 0 to 1 over `transitionMs`, then resets to 0 with the new image as
// texture1.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type LiquidStyle = "ripple" | "glass" | "dissolve" | "cut";

export interface GgmLiquidCanvasProps {
  images: string[];
  activeIndex: number;
  style?: LiquidStyle;
  transitionMs?: number;
  intensity?: number;
  distortion?: number;
  className?: string;
  onTransitionEnd?: () => void;
  reducedMotion?: boolean;
}

export interface GgmLiquidCanvasHandle {
  /** Snapshot the current frame and return a data URL — useful when a
   *  scene needs to "freeze" its visual state before morphing out. */
  snapshot: () => string | null;
}

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Combined fragment shader ported from the reference's `glassEffect`
// and `rippleEffect`. Effect index: 0 = ripple, 1 = glass.
// Simplified: removes chromatic-aberration extremes, dropped the
// frost/plasma/timeshift branches, kept the cover-UV helper verbatim.
const FRAG = `#version 300 es
precision highp float;

uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform float uProgress;            // 0..1
uniform vec2 uResolution;
uniform vec2 uTexture1Size;
uniform vec2 uTexture2Size;
uniform int  uEffect;               // 0 = ripple, 1 = glass
uniform float uIntensity;
uniform float uDistortion;

in vec2 vUv;
out vec4 outColor;

vec2 getCoverUV(vec2 uv, vec2 textureSize) {
  vec2 s = uResolution / textureSize;
  float scale = max(s.x, s.y);
  vec2 scaledSize = textureSize * scale;
  vec2 offset = (uResolution - scaledSize) * 0.5;
  return (uv * uResolution - offset) / scaledSize;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// ── Ripple ───────────────────────────────────────────────────────────
vec4 ripple(vec2 uv, float progress) {
  vec4 currentImg = texture(uTexture1, getCoverUV(uv, uTexture1Size));
  vec4 newImg     = texture(uTexture2, getCoverUV(uv, uTexture2Size));

  vec2 center = vec2(0.5);
  float dist  = distance(uv, center);
  float maxDist = 0.85;
  float waveRadius = progress * maxDist * 1.55;

  float amp  = 0.08 * uDistortion * uIntensity;
  float freq = 26.0;

  float r1 = sin((dist - waveRadius)        * freq)        * exp(-abs(dist - waveRadius)        * 8.0);
  float r2 = sin((dist - waveRadius * 0.7)  * freq * 1.3)  * exp(-abs(dist - waveRadius * 0.7)  * 6.0) * 0.6;
  float r3 = sin((dist - waveRadius * 0.42) * freq * 1.85) * exp(-abs(dist - waveRadius * 0.42) * 4.0) * 0.3;
  float combined = (r1 + r2 + r3) * amp;

  vec2 normal = normalize(uv - center + vec2(0.0001));
  vec2 distortedUV = getCoverUV(uv + normal * combined, uTexture2Size);
  vec4 distortedImg = texture(uTexture2, distortedUV);

  float fadeEdge = smoothstep(maxDist, maxDist * 0.88, dist);
  vec4 rippleResult = mix(newImg, distortedImg, fadeEdge);

  float mask = smoothstep(0.0, 0.32, progress) * (1.0 - smoothstep(0.7, 1.0, progress));
  rippleResult = mix(newImg, rippleResult, mask);

  float transition = smoothstep(0.0, 1.0, progress);
  return mix(currentImg, rippleResult, transition);
}

// ── Glass (bubble emergence) ─────────────────────────────────────────
vec4 glass(vec2 uv, float progress) {
  vec2 center = vec2(0.5);
  vec2 p = uv * uResolution;
  vec2 sphereCenter = center * uResolution;

  vec2 uv1 = getCoverUV(uv, uTexture1Size);
  vec2 uv2_base = getCoverUV(uv, uTexture2Size);

  float maxRadius   = length(uResolution) * 0.85;
  float bubbleRadius = progress * maxRadius;
  float dist = length(p - sphereCenter);
  float normalizedDist = dist / max(bubbleRadius, 0.001);
  vec2  direction = (dist > 0.0) ? (p - sphereCenter) / dist : vec2(0.0);
  float inside = smoothstep(bubbleRadius + 3.0, bubbleRadius - 3.0, dist);

  float distanceFactor = smoothstep(0.3, 1.0, normalizedDist);
  float t = progress * 5.0;

  vec2 liquidSurface = vec2(
    smoothNoise(uv * 100.0 + t * 0.3),
    smoothNoise(uv * 100.0 + t * 0.2 + 50.0)
  ) - 0.5;
  liquidSurface *= 0.004 * uDistortion * distanceFactor;

  vec2 distortedUV = uv2_base;
  if (inside > 0.0) {
    float refractionOffset = 0.07 * uIntensity * uDistortion * pow(distanceFactor, 1.5);
    vec2 flowDirection = normalize(direction + vec2(sin(t), cos(t * 0.7)) * 0.3);
    distortedUV -= flowDirection * refractionOffset;

    float wave1 = sin(normalizedDist * 22.0 - t * 3.5);
    float wave2 = sin(normalizedDist * 35.0 + t * 2.8) * 0.7;
    float combinedWave = (wave1 + wave2) * 0.5;
    float waveOffset = combinedWave * 0.022 * uDistortion * distanceFactor;
    distortedUV -= direction * waveOffset + liquidSurface;
  }

  vec4 newImg = texture(uTexture2, distortedUV);

  // Subtle rim highlight at the bubble edge — preserved from reference.
  if (inside > 0.0) {
    float rim = smoothstep(0.95, 1.0, normalizedDist) *
                (1.0 - smoothstep(1.0, 1.01, normalizedDist));
    newImg.rgb += rim * 0.08 * (1.0 - smoothstep(0.85, 1.0, progress));
  }

  vec4 currentImg = texture(uTexture1, uv1);

  if (progress > 0.95) {
    vec4 pureNewImg = texture(uTexture2, uv2_base);
    float endTransition = (progress - 0.95) / 0.05;
    newImg = mix(newImg, pureNewImg, endTransition);
  }

  return mix(currentImg, newImg, inside);
}

void main() {
  vec2 uv = vUv;
  vec4 color;
  if (uEffect == 1) {
    color = glass(uv, uProgress);
  } else {
    color = ripple(uv, uProgress);
  }
  outColor = color;
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn("[GgmLiquidCanvas] shader compile failed:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function linkProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn("[GgmLiquidCanvas] link failed:", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function uploadTexture(gl: WebGL2RenderingContext, img: HTMLImageElement): { tex: WebGLTexture; w: number; h: number } | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Flip the Y axis so HTMLImageElement (top-down) matches WebGL's
  // bottom-up UV origin. Without this the artwork renders upside-down.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  return { tex, w: img.naturalWidth || 1, h: img.naturalHeight || 1 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export const GgmLiquidCanvas = forwardRef<GgmLiquidCanvasHandle, GgmLiquidCanvasProps>(
  function GgmLiquidCanvas(
    {
      images,
      activeIndex,
      style = "ripple",
      transitionMs = 1100,
      intensity = 1,
      distortion = 1,
      className,
      onTransitionEnd,
      reducedMotion,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fallbackImgRef = useRef<HTMLImageElement | null>(null);
    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const progRef = useRef<WebGLProgram | null>(null);
    const texturesRef = useRef<Map<string, { tex: WebGLTexture; w: number; h: number }>>(new Map());
    const currentImageRef = useRef<string | null>(null);
    // Most recent render args, kept so that resize / texture-load events
    // can re-render the canvas without restarting an animation.
    const lastRenderRef = useRef<{
      tex1: string;
      tex2: string;
      progress: number;
      effect: number;
      intensity: number;
      distortion: number;
    } | null>(null);
    const [usesGL, setUsesGL] = useState(true);
    const [reduced, setReduced] = useState(false);

    useImperativeHandle(ref, () => ({
      snapshot: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        try {
          return canvas.toDataURL("image/webp", 0.85);
        } catch {
          return null;
        }
      },
    }), []);

    // Detect reduced motion + low-power.
    useEffect(() => {
      if (typeof window === "undefined") return;
      const update = () => {
        const reducedMql = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setReduced(Boolean(reducedMotion || reducedMql));
      };
      update();
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }, [reducedMotion]);

    // Setup GL once.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (style === "cut" || reduced) {
        setUsesGL(false);
        return;
      }
      const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true });
      if (!gl) {
        setUsesGL(false);
        return;
      }
      glRef.current = gl;
      const prog = linkProgram(gl);
      if (!prog) {
        setUsesGL(false);
        return;
      }
      progRef.current = prog;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      return () => {
        try {
          gl.deleteProgram(prog);
        } catch {
          /* ignore */
        }
        try {
          texturesRef.current.forEach((t) => gl.deleteTexture(t.tex));
        } catch {
          /* ignore */
        }
        texturesRef.current.clear();
        glRef.current = null;
        progRef.current = null;
      };
    }, [style, reduced]);

    // Resize canvas to match its CSS box and re-render the last frame
    // so a resize never leaves the canvas blank.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ro = new ResizeObserver(() => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth | 0;
        const h = canvas.clientHeight | 0;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        const gl = glRef.current;
        const prog = progRef.current;
        if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
        // Re-render the last static frame if we have one. Animations
        // overwrite this on their next rAF tick.
        if (gl && prog) {
          const last = lastRenderRef.current;
          if (last) {
            const t1 = texturesRef.current.get(last.tex1);
            const t2 = texturesRef.current.get(last.tex2);
            if (t1 && t2) {
              renderFrame({
                gl, prog, canvas,
                tex1: t1, tex2: t2,
                progress: last.progress,
                effect: last.effect,
                intensity: last.intensity,
                distortion: last.distortion,
              });
            }
          }
        }
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }, []);

    // Preload textures whenever the image set changes.
    useEffect(() => {
      const gl = glRef.current;
      const prog = progRef.current;
      const canvas = canvasRef.current;
      if (!gl || !prog || !canvas || !usesGL) return;
      let cancelled = false;
      (async () => {
        for (const src of images) {
          if (cancelled) return;
          if (texturesRef.current.has(src)) continue;
          try {
            const img = await loadImage(src);
            if (cancelled) return;
            const t = uploadTexture(gl, img);
            if (t) {
              texturesRef.current.set(src, t);
              // If this is the texture we've been waiting to display,
              // render it now.
              const last = lastRenderRef.current;
              if (last && (last.tex1 === src || last.tex2 === src)) {
                const t1 = texturesRef.current.get(last.tex1);
                const t2 = texturesRef.current.get(last.tex2);
                if (t1 && t2) {
                  renderFrame({
                    gl, prog, canvas,
                    tex1: t1, tex2: t2,
                    progress: last.progress,
                    effect: last.effect,
                    intensity: last.intensity,
                    distortion: last.distortion,
                  });
                }
              }
            }
          } catch {
            // ignore — fallback img will render the right image via plain <img>.
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [images, usesGL]);

    // Initial render of the active image (no progress animation).
    useEffect(() => {
      if (!usesGL) return;
      const gl = glRef.current;
      const prog = progRef.current;
      const canvas = canvasRef.current;
      if (!gl || !prog || !canvas) return;
      const src = images[activeIndex];
      if (!src) return;
      currentImageRef.current = src;
      // If texture is ready, render now; otherwise wait for next frame.
      const tryRender = () => {
        const t = texturesRef.current.get(src);
        if (!t) {
          requestAnimationFrame(tryRender);
          return;
        }
        lastRenderRef.current = {
          tex1: src,
          tex2: src,
          progress: 0,
          effect: 0,
          intensity,
          distortion,
        };
        renderFrame({
          gl,
          prog,
          canvas,
          tex1: t,
          tex2: t,
          progress: 0,
          effect: 0,
          intensity,
          distortion,
        });
      };
      tryRender();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usesGL]);

    // Animate the transition when activeIndex changes.
    useEffect(() => {
      if (!usesGL) {
        // Fallback: simply update the image element shown.
        const img = fallbackImgRef.current;
        if (img && images[activeIndex]) img.src = images[activeIndex];
        if (onTransitionEnd) {
          // Run on next frame so consumers can chain.
          requestAnimationFrame(() => onTransitionEnd());
        }
        return;
      }
      const gl = glRef.current;
      const prog = progRef.current;
      const canvas = canvasRef.current;
      if (!gl || !prog || !canvas) return;
      const targetSrc = images[activeIndex];
      const currentSrc = currentImageRef.current ?? targetSrc;
      if (!targetSrc || targetSrc === currentSrc) {
        if (onTransitionEnd) requestAnimationFrame(() => onTransitionEnd());
        return;
      }
      let cancelled = false;
      const start = performance.now();
      const dur = Math.max(120, transitionMs);
      const effect = style === "glass" ? 1 : 0;
      const tick = (now: number) => {
        if (cancelled) return;
        const t1 = texturesRef.current.get(currentSrc);
        const t2 = texturesRef.current.get(targetSrc);
        if (!t1 || !t2) {
          requestAnimationFrame(tick);
          return;
        }
        const p = Math.min(1, (now - start) / dur);
        const eased = easeInOutCubic(p);
        lastRenderRef.current = {
          tex1: currentSrc,
          tex2: targetSrc,
          progress: eased,
          effect,
          intensity,
          distortion,
        };
        renderFrame({
          gl,
          prog,
          canvas,
          tex1: t1,
          tex2: t2,
          progress: eased,
          effect,
          intensity,
          distortion,
        });
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          currentImageRef.current = targetSrc;
          // Pin the resting frame to the new image so later resize
          // events render it cleanly instead of the morph midpoint.
          lastRenderRef.current = {
            tex1: targetSrc,
            tex2: targetSrc,
            progress: 0,
            effect: 0,
            intensity,
            distortion,
          };
          if (onTransitionEnd) onTransitionEnd();
        }
      };
      requestAnimationFrame(tick);
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex, usesGL]);

    const fallbackSrc = images[activeIndex] ?? images[0] ?? null;

    return (
      <div className={className} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {usesGL ? (
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
            aria-hidden
          />
        ) : null}
        {/* Fallback / accessibility: always render an image element with
            the active scene image so screen readers and screenshot
            tools have a stable visual when GL is off. When GL is on,
            this layer sits underneath the canvas and is invisible. */}
        {fallbackSrc && (
          <img
            ref={fallbackImgRef}
            src={fallbackSrc}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: usesGL ? -1 : 0,
              opacity: usesGL ? 0 : 1,
              transition: usesGL ? undefined : "opacity 220ms ease",
            }}
          />
        )}
      </div>
    );
  },
);

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface RenderArgs {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  canvas: HTMLCanvasElement;
  tex1: { tex: WebGLTexture; w: number; h: number };
  tex2: { tex: WebGLTexture; w: number; h: number };
  progress: number;
  effect: number;
  intensity: number;
  distortion: number;
}

function renderFrame({ gl, prog, canvas, tex1, tex2, progress, effect, intensity, distortion }: RenderArgs) {
  gl.useProgram(prog);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex1.tex);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex2.tex);

  setUniform(gl, prog, "uTexture1", 0, "1i");
  setUniform(gl, prog, "uTexture2", 1, "1i");
  setUniform(gl, prog, "uProgress", progress, "1f");
  setUniform(gl, prog, "uIntensity", intensity, "1f");
  setUniform(gl, prog, "uDistortion", distortion, "1f");
  setUniform(gl, prog, "uEffect", effect, "1i");
  setUniform2f(gl, prog, "uResolution", canvas.width, canvas.height);
  setUniform2f(gl, prog, "uTexture1Size", tex1.w, tex1.h);
  setUniform2f(gl, prog, "uTexture2Size", tex2.w, tex2.h);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function setUniform(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  name: string,
  v: number,
  kind: "1i" | "1f",
) {
  const loc = gl.getUniformLocation(prog, name);
  if (!loc) return;
  if (kind === "1i") gl.uniform1i(loc, v);
  else gl.uniform1f(loc, v);
}

function setUniform2f(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  name: string,
  a: number,
  b: number,
) {
  const loc = gl.getUniformLocation(prog, name);
  if (!loc) return;
  gl.uniform2f(loc, a, b);
}
