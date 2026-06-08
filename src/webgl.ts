// WebGL refraction for a hero whose backdrop is a live <video>. Safari composites
// video on the GPU and won't hand those pixels to an SVG filter (and won't re-run
// a filter as a <canvas> updates), so — per Aave's "Building Glass for the Web" —
// we read the playing video as a texture and draw each control's lens from it in
// a fragment shader, which re-renders every frame.
//
// One renderer per hero: each frame it finds the active backdrop media (video or
// image) in the hero and the `.glass-lens` controls inside it, and draws a
// refracting lens at each — all reading from that one texture.

import { washAlpha } from "./wash"

const VERT = `
attribute vec2 aPos;
attribute vec2 aScreen;
varying vec2 vScreen;
void main() {
  vScreen = aScreen;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
uniform sampler2D uMedia;
uniform vec2 uOrigin;      // displayed media top-left, canvas px (object-cover)
uniform vec2 uSize;        // displayed media size, canvas px
uniform vec2 uLensCenter;  // canvas px
uniform vec2 uLensHalf;    // canvas px
uniform float uRadius, uBezel, uCurve, uScale, uThickness, uDispersion;
uniform float uDim;        // wash darkening (0 = none) — for standalone lenses
varying vec2 vScreen;

float sdf(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vScreen - uLensCenter;
  float r = min(uRadius, min(uLensHalf.x, uLensHalf.y));
  float d = sdf(p, uLensHalf, r);
  if (d > 0.5) discard;                       // outside the lens
  vec2 disp = vec2(0.0);
  if (d > -uBezel) {
    float dx = sdf(p + vec2(1.0, 0.0), uLensHalf, r) - sdf(p - vec2(1.0, 0.0), uLensHalf, r);
    float dy = sdf(p + vec2(0.0, 1.0), uLensHalf, r) - sdf(p - vec2(0.0, 1.0), uLensHalf, r);
    vec2 n = normalize(vec2(dx, dy));
    float t = clamp(1.0 + d / uBezel, 0.0, 1.0);
    disp = n * pow(t, uCurve) * uScale;       // px of refraction at the rim
  }
  // Convex lensing: sample toward the centre, ramping with distance, so the glass
  // reads as a thick dome that magnifies the backdrop (not just bends the rim).
  float dist = length(p);
  if (dist > 0.5) {
    float rn = clamp(dist / min(uLensHalf.x, uLensHalf.y), 0.0, 1.0);
    disp += -(p / dist) * rn * rn * uThickness * uScale;
  }
  // uv is derived straight from screen coords (top-down), matching how the media
  // uploads without UNPACK_FLIP_Y — so no vertical flip. Chromatic aberration:
  // split the per-channel sample along the displacement for a coloured rim fringe.
  vec2 base = (vScreen - uOrigin) / uSize;
  vec2 dUV = disp / uSize;
  vec3 col = vec3(
    texture2D(uMedia, clamp(base + dUV * (1.0 + uDispersion), 0.0, 1.0)).r,
    texture2D(uMedia, clamp(base + dUV, 0.0, 1.0)).g,
    texture2D(uMedia, clamp(base + dUV * (1.0 - uDispersion), 0.0, 1.0)).b
  );
  // Composite the scene's dark readability wash so the lens matches its
  // surroundings instead of reading as a bright cut-out (standalone lenses, whose
  // own canvas isn't painted over by the hero's washes like in-hero controls are).
  gl_FragColor = vec4(col * (1.0 - uDim), 1.0);
}`

export type GlassRendererParams = {
  scale: number // half the feDisplacementMap strength → px of rim refraction
  bezel: number // width of the refracting edge band, px
  curve: number // rim ramp exponent
  thickness: number // convex lensing across the surface
  dispersion: number // chromatic aberration amount
}

type Media = HTMLVideoElement | HTMLImageElement
// A video counts as ready ONLY once it has a paintable frame (readyState ≥ 2 =
// HAVE_CURRENT_DATA), not merely metadata (videoWidth > 0). Sampling it at metadata
// uploads a black frame — which flashed the lens black for a frame as it switched
// off the poster on load / slide change. Until then "last ready wins" keeps the
// poster <img> behind the clip (which is there for exactly this).
const ready = (m: Media) =>
  m instanceof HTMLVideoElement
    ? m.videoWidth > 0 && m.readyState >= 2
    : m.naturalWidth > 0
const intrinsic = (m: Media) =>
  m instanceof HTMLVideoElement
    ? ([m.videoWidth, m.videoHeight] as const)
    : ([m.naturalWidth, m.naturalHeight] as const)

/** The backdrop media to refract. Prefers whatever the active slide marks with
 *  `[data-hero-active]` (the video once decoded, else its poster image), so the
 *  lens always matches the slide actually on screen. Falls back to the
 *  most-visible ready media if the hero doesn't mark an active slide. */
function activeMedia(hero: HTMLElement): Media | null {
  const slide = hero.querySelector("[data-hero-active]")
  if (slide) {
    let best: Media | null = null
    slide.querySelectorAll<Media>("video, img").forEach((m) => {
      if (ready(m)) best = m // last ready wins → the video over its own poster
    })
    return best
  }
  let best: Media | null = null
  let bestOp = 0.4
  hero.querySelectorAll<Media>("video, img").forEach((m) => {
    if (!ready(m)) return
    let op = 1
    let node: HTMLElement | null = m
    while (node && node !== hero) {
      op *= parseFloat(getComputedStyle(node).opacity) || 1
      node = node.parentElement
    }
    if (op >= bestOp) {
      bestOp = op
      best = m
    }
  })
  return best
}

/** For a glass control OUTSIDE the hero (e.g. the fixed header menu button): the
 *  live-video backdrop it currently sits over (the active slide's video, else its
 *  poster) plus the readability-wash darkening at its centre — or null when it has
 *  scrolled past the hero, is covered by an opaque ancestor (the solid scrolled
 *  header bar), or by a [data-glass-occluder] (an open menu/modal). null ⇒ nothing
 *  to refract, so the surface frosts instead. Geometry-based (not elementsFromPoint,
 *  which skips the pointer-events:none washes) so the wash is actually counted. */
export function videoBackdrop(
  host: HTMLElement,
): { media: Media; dim: number } | null {
  const r = host.getBoundingClientRect()
  if (r.width < 2) return null
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const slide = document.querySelector("[data-hero-active]")
  if (!slide) return null
  let media: Media | null = null
  slide.querySelectorAll<Media>("video, img").forEach((m) => {
    if (ready(m)) media = m // last ready wins → the video over its own poster
  })
  if (!media) return null
  const covers = (el: Element) => {
    const b = el.getBoundingClientRect()
    return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom
  }
  if (!covers(media)) return null // scrolled past the hero
  for (const occ of document.querySelectorAll<HTMLElement>(
    "[data-glass-occluder]",
  )) {
    const cs = getComputedStyle(occ)
    const shown =
      cs.opacity !== "0" && cs.display !== "none" && cs.visibility !== "hidden"
    if (shown && covers(occ)) return null // open menu / modal over the hero
  }
  let dim = 0
  for (const w of document.querySelectorAll<HTMLElement>("[data-glass-wash]"))
    if (covers(w)) dim = dim + washAlpha(w, cx, cy) * (1 - dim)
  // The control's own ancestors, up to and including the nearest fixed/sticky one
  // (the header) — that's the layer painted OVER the video. A header's gradient
  // darkens the lens; its solid bar, once scrolled, reads opaque and occludes the
  // video entirely (→ frost). Stop there: anything beyond a fixed ancestor (the
  // page's own background) sits BEHIND the video, so it must not count.
  let node = host.parentElement
  while (node && node !== document.body) {
    const a = washAlpha(node, cx, cy)
    if (a >= 0.9) return null
    dim = dim + a * (1 - dim)
    const pos = getComputedStyle(node).position
    if (pos === "fixed" || pos === "sticky") break
    node = node.parentElement
  }
  return { media, dim }
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("[glass] shader compile failed:", gl.getShaderInfoLog(s))
  }
  return s
}

/** Decouple where the live media is found from which controls get a lens, so the
 *  same renderer can draw a single control (e.g. the fixed header menu button,
 *  which lives outside the hero) onto its own button-sized canvas while still
 *  sampling the hero's video:
 *    createGlassRenderer(buttonCanvas, buttonEl, params, {
 *      mediaHost: document.body, lenses: () => [buttonEl] })
 *  `hero` then only sets the canvas size + coordinate origin (button-local). */
export function createGlassRenderer(
  canvas: HTMLCanvasElement,
  hero: HTMLElement,
  params: GlassRendererParams,
  opts?: {
    mediaHost?: HTMLElement
    lenses?: () => HTMLElement[]
    /** Standalone mode: `hero` IS the single control. Each frame it finds the
     *  live video it sits over (videoBackdrop) — baking in the wash and clearing
     *  when there's nothing to refract — and reports that via onActive. Used by a
     *  GlassSurface outside the hero (the fixed header button) to lens its own
     *  canvas off the hero video. */
    standalone?: boolean
    onActive?: (active: boolean) => void
  },
) {
  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: false,
    alpha: true,
    antialias: true,
    // Standalone lenses freeze their last frame when they leave the video (the
    // surface fades the canvas out over it), which needs the buffer preserved.
    // ?glassdebug also keeps it readable for off-frame readPixels checks.
    preserveDrawingBuffer:
      !!opts?.standalone ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("glassdebug")),
  })
  if (!gl) return null

  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[glass] program link failed:", gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)

  const aPos = gl.getAttribLocation(prog, "aPos")
  const aScreen = gl.getAttribLocation(prog, "aScreen")
  const u = (n: string) => gl.getUniformLocation(prog, n)
  const uOrigin = u("uOrigin")
  const uSize = u("uSize")
  const uLensCenter = u("uLensCenter")
  const uLensHalf = u("uLensHalf")
  const uRadius = u("uRadius")
  const uBezel = u("uBezel")
  const uCurve = u("uCurve")
  const uScale = u("uScale")
  const uThickness = u("uThickness")
  const uDispersion = u("uDispersion")
  const uDim = u("uDim")

  const posBuf = gl.createBuffer()
  const screenBuf = gl.createBuffer()
  const tex = gl.createTexture()
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  // Clear once up front so a preserveDrawingBuffer canvas (standalone) never starts
  // as an opaque-black frame before its first real draw.
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  let raf = 0
  let lastMedia: Media | null = null
  let lastT = -1
  let cssW = 0
  let cssH = 0
  let live: GlassRendererParams = params
  const mediaHost = opts?.mediaHost ?? hero
  const lensesOf =
    opts?.lenses ??
    (() => Array.from(hero.querySelectorAll<HTMLElement>(".glass-lens")))
  const standalone = !!opts?.standalone
  let wasActive = false

  const radiusOf = (el: HTMLElement, w: number, h: number) => {
    const br = parseFloat(getComputedStyle(el).borderRadius) || 0
    return br > Math.min(w, h) ? Math.min(w, h) / 2 : br
  }

  const drawLens = (
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    radius: number,
    margin: number,
  ) => {
    const x0 = cx - hw - margin
    const x1 = cx + hw + margin
    const y0 = cy - hh - margin
    const y1 = cy + hh + margin
    const clipX = (x: number) => (x / cssW) * 2 - 1
    const clipY = (y: number) => 1 - (y / cssH) * 2
    // prettier-ignore
    const pos = new Float32Array([
      clipX(x0), clipY(y0), clipX(x1), clipY(y0), clipX(x0), clipY(y1),
      clipX(x0), clipY(y1), clipX(x1), clipY(y0), clipX(x1), clipY(y1),
    ])
    // prettier-ignore
    const scr = new Float32Array([
      x0, y0, x1, y0, x0, y1,
      x0, y1, x1, y0, x1, y1,
    ])
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, screenBuf)
    gl.bufferData(gl.ARRAY_BUFFER, scr, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(aScreen)
    gl.vertexAttribPointer(aScreen, 2, gl.FLOAT, false, 0, 0)
    gl.uniform2f(uLensCenter, cx, cy)
    gl.uniform2f(uLensHalf, hw, hh)
    gl.uniform1f(uRadius, radius)
    gl.uniform1f(uBezel, Math.min(live.bezel, hw, hh))
    gl.uniform1f(uCurve, live.curve)
    gl.uniform1f(uScale, live.scale)
    gl.uniform1f(uThickness, live.thickness)
    gl.uniform1f(uDispersion, live.dispersion)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  const frame = () => {
    raf = requestAnimationFrame(frame)
    let media: Media | null
    let dim = 0
    if (standalone) {
      const detected = videoBackdrop(hero)
      if (!!detected !== wasActive) {
        wasActive = !!detected
        opts?.onActive?.(wasActive)
      }
      // Off the video: FREEZE — leave the last frame in the (preserved) buffer
      // and bail before the clear, so the surface can fade the canvas out over it
      // instead of it vanishing to a hard cut. The DOM goes transparent meanwhile.
      if (!detected) return
      media = detected.media
      dim = detected.dim
    } else {
      media = activeMedia(mediaHost)
    }
    const hr = hero.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (Math.round(hr.width) !== cssW || Math.round(hr.height) !== cssH) {
      cssW = Math.round(hr.width)
      cssH = Math.round(hr.height)
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.width = cssW + "px"
      canvas.style.height = cssH + "px"
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (!media) {
      lastMedia = null
      return
    }

    // (Re)upload the texture — every advancing video frame, once per image.
    const vid = media instanceof HTMLVideoElement ? media : null
    if (media !== lastMedia || (vid && vid.currentTime !== lastT)) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media)
      } catch {
        return // tainted/incomplete frame; try again next tick
      }
      lastMedia = media
      lastT = vid ? vid.currentTime : -1
    }
    gl.bindTexture(gl.TEXTURE_2D, tex)

    // Media display rect (object-cover), in canvas px.
    const mr = media.getBoundingClientRect()
    const [iw, ih] = intrinsic(media)
    const sc = Math.max(mr.width / iw, mr.height / ih)
    const dw = iw * sc
    const dh = ih * sc
    gl.uniform2f(uOrigin, mr.left - hr.left - (dw - mr.width) / 2, mr.top - hr.top - (dh - mr.height) / 2)
    gl.uniform2f(uSize, dw, dh)
    gl.uniform1f(uDim, dim) // wash darkening (0 unless standalone)

    const margin = Math.ceil(live.scale) + 4
    lensesOf().forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width < 2) return
      drawLens(
        r.left - hr.left + r.width / 2,
        r.top - hr.top + r.height / 2,
        r.width / 2,
        r.height / 2,
        radiusOf(el, r.width, r.height),
        margin,
      )
    })
  }

  raf = requestAnimationFrame(frame)
  const api = {
    setParams(p: GlassRendererParams) {
      live = p
    },
    // Pump one frame by hand (for environments where rAF doesn't fire — tests).
    render: frame,
    destroy() {
      cancelAnimationFrame(raf)
      gl.deleteProgram(prog)
      gl.deleteTexture(tex)
      gl.deleteBuffer(posBuf)
      gl.deleteBuffer(screenBuf)
    },
  }
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("glassdebug")
  ) {
    ;(window as unknown as { __glass?: typeof api }).__glass = api
  }
  return api
}
