"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useGlassTuner, useInLensHero } from "./context"
import { SVG_BACKDROP, WEBGL_VIDEO } from "./env"
import { GLASS_PRESETS, DEFAULT_PRESET, type GlassPresetName } from "./presets"
import { useGlassLight } from "./light"
import { washAlpha } from "./wash"
import { createGlassRenderer } from "./webgl"

// Fill-the-control positioning, inline so the package needs no utility CSS.
const FILL = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
} as const

type Media = HTMLVideoElement | HTMLImageElement
const mediaSize = (m: Media) =>
  m instanceof HTMLVideoElement
    ? ([m.videoWidth, m.videoHeight] as const)
    : ([m.naturalWidth, m.naturalHeight] as const)

/** Find the topmost visible video/img in this control's hero section that sits
 *  behind it — the thing to refract on the canvas path. */
function findBackdrop(host: HTMLElement): Media | null {
  const sec = host.closest("section")
  if (!sec) return null
  const hr = host.getBoundingClientRect()
  const cx = hr.left + hr.width / 2
  const cy = hr.top + hr.height / 2
  let best: Media | null = null
  sec.querySelectorAll("video, img").forEach((el) => {
    const m = el as Media
    const r = m.getBoundingClientRect()
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return
    if (parseFloat(getComputedStyle(m).opacity) < 0.4) return
    const [iw] = mediaSize(m)
    if (!iw) return
    best = m // later in DOM ≈ painted on top
  })
  return best
}

/** Result of a capture attempt: "drawn" = refracting, "frost" = a valid no-
 *  refraction state (control over the letterbox), "retry" = not ready this frame
 *  (image undecoded / zero-size) so the caller should try again, not record it. */
type DrawResult = "drawn" | "frost" | "retry"

/** Draw the region of `media` behind `host` (plus a `margin` so the refraction
 *  doesn't sample past the edge) into `canvas`, honoring object-fit/position. */
function drawBackdrop(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  media: Media,
  margin: number,
): DrawResult {
  const hr = host.getBoundingClientRect()
  const mr = media.getBoundingClientRect()
  const [iw, ih] = mediaSize(media)
  if (!iw || !ih || hr.width < 1 || mr.width < 1) return "retry"
  const cs = getComputedStyle(media)
  const scale =
    cs.objectFit === "contain"
      ? Math.min(mr.width / iw, mr.height / ih)
      : Math.max(mr.width / iw, mr.height / ih)
  const dw = iw * scale
  const dh = ih * scale
  const op = cs.objectPosition.split(" ")
  const px = (parseFloat(op[0]) || 50) / 100
  const py = (parseFloat(op[1] ?? op[0]) || 50) / 100
  const cropX = (dw - mr.width) * px
  const cropY = (dh - mr.height) * py
  const ew = hr.width + margin * 2
  const eh = hr.height + margin * 2
  const sx = (hr.left - margin - mr.left + cropX) / scale
  const sy = (hr.top - margin - mr.top + cropY) / scale
  const sw = ew / scale
  const sh = eh / scale
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(ew * dpr)
  canvas.height = Math.round(eh * dpr)
  canvas.style.left = `-${margin}px`
  canvas.style.top = `-${margin}px`
  canvas.style.width = `${ew}px`
  canvas.style.height = `${eh}px`
  const ctx = canvas.getContext("2d")
  if (!ctx) return "retry"
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // Frosted (no refraction) when the control's center sits off the image — over
  // the letterbox of a contained/panned photo. Refracting there only stretches
  // the image's edge pixels (the smeared look when you drag the photo away).
  const ccx = (hr.left + hr.width / 2 - mr.left + cropX) / scale
  const ccy = (hr.top + hr.height / 2 - mr.top + cropY) / scale
  if (ccx < 0 || ccx > iw || ccy < 0 || ccy > ih) return "frost"
  // Draw only the part of the sample region that's actually on the image, mapped
  // to the matching slice of the canvas; leave the rest transparent so the dark
  // backdrop shows through instead of the edge stretching.
  const cx0 = Math.max(0, sx)
  const cy0 = Math.max(0, sy)
  const cx1 = Math.min(iw, sx + sw)
  const cy1 = Math.min(ih, sy + sh)
  if (cx1 <= cx0 || cy1 <= cy0) return "frost"
  const kx = canvas.width / sw
  const ky = canvas.height / sh
  try {
    ctx.drawImage(
      media,
      cx0,
      cy0,
      cx1 - cx0,
      cy1 - cy0,
      (cx0 - sx) * kx,
      (cy0 - sy) * ky,
      (cx1 - cx0) * kx,
      (cy1 - cy0) * ky,
    )
  } catch {
    return "retry"
  }
  // Composite the hero's readability washes (marked [data-glass-wash]) over the
  // captured image so the lens darkens to match its surroundings, like the live
  // backdrop-filter does on Chromium. Evaluated at the control centre (the band
  // is near-constant across the small control).
  const sec = host.closest("section")
  const washes = sec?.querySelectorAll<HTMLElement>("[data-glass-wash]")
  if (washes && washes.length) {
    const cx = hr.left + hr.width / 2
    const cy = hr.top + hr.height / 2
    let a = 0
    washes.forEach((w) => {
      a = a + washAlpha(w, cx, cy) * (1 - a) // stack black-over-black
    })
    if (a > 0.002) {
      ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }
  return "drawn"
}

/** Displacement map: neutral (128,128) except within `bezel` px of a rounded
 *  rect inset by `inset` from the canvas, where R/G encode the outward normal
 *  (ramped by `curve`) so the displacement bends the backdrop at the rim. */
function lensMap(
  w: number,
  h: number,
  radius: number,
  bezel: number,
  curve: number,
  inset: number,
  thickness: number,
): string {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (!ctx) return ""
  const im = ctx.createImageData(w, h)
  const d = im.data
  const hw = w / 2
  const hh = h / 2
  const bw = hw - inset
  const bh = hh - inset
  const r = Math.max(0, Math.min(radius, bw, bh))
  const sdf = (px: number, py: number) => {
    const qx = Math.abs(px) - (bw - r)
    const qy = Math.abs(py) - (bh - r)
    return (
      Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
      Math.min(Math.max(qx, qy), 0) -
      r
    )
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x - hw + 0.5
      const py = y - hh + 0.5
      const s = sdf(px, py)
      let dr = 0
      let dg = 0
      if (s < 0) {
        // Convex dome across the whole interior: displace toward centre, ramping
        // with distance² — magnifies the backdrop like a thick lens.
        const dist = Math.hypot(px, py)
        if (dist > 0.001 && thickness > 0) {
          const rn = Math.min(dist / Math.min(bw, bh), 1)
          const cmag = thickness * rn * rn * 127
          dr += (-px / dist) * cmag
          dg += (-py / dist) * cmag
        }
        // Refracting rim band (outward normal, ramped by curve).
        if (s > -bezel) {
          const nx = sdf(px + 1, py) - sdf(px - 1, py)
          const ny = sdf(px, py + 1) - sdf(px, py - 1)
          const len = Math.hypot(nx, ny) || 1
          const t = 1 + s / bezel
          const mag = Math.pow(t, curve) * 127
          dr += (nx / len) * mag
          dg += (ny / len) * mag
        }
      }
      const R = Math.max(0, Math.min(255, 128 + dr))
      const G = Math.max(0, Math.min(255, 128 + dg))
      const i = (y * w + x) * 4
      d[i] = R
      d[i + 1] = G
      d[i + 2] = 128
      d[i + 3] = 255
    }
  }
  ctx.putImageData(im, 0, 0)
  return c.toDataURL()
}

/**
 * A glass surface to drop (absolutely) inside any positioned, rounded control.
 * Frosted blur + a specular edge everywhere; edge refraction on Chromium via
 * backdrop-filter, on Safari/Firefox via a captured-backdrop canvas (live image)
 * or the hero's WebGL lens (live video). The look comes from a named `preset`
 * (overridable per prop) and is driven live by the ?glass tuner.
 */
export function GlassSurface({
  preset = DEFAULT_PRESET,
  radius,
  blur,
  saturate,
  scale,
  bezel,
  curve,
  thickness,
  dispersion,
  edge,
  light,
  glow,
  tint,
  border,
  refract = true,
  reveal = false,
  captureKey,
  live = false,
  standalone = false,
  tunerPreview = false,
  className = "",
}: {
  /** Named look preset (defaults to "hero"); see GLASS_PRESETS. */
  preset?: GlassPresetName
  /** Per-instance overrides of the preset's params. */
  radius?: number
  blur?: number
  saturate?: number
  scale?: number
  bezel?: number
  curve?: number
  thickness?: number
  dispersion?: number
  edge?: number
  light?: number
  glow?: number
  tint?: number
  border?: number
  refract?: boolean
  /** Add the hover/focus/active brightness "reveal" that lifts the dark wash
   *  behind the lens. Renders in front of the glass — place the icon after it. */
  reveal?: boolean
  /** Change this (e.g. the active photo index) to re-capture the backdrop on the
   *  canvas path — for backdrops that swap in place, like a lightbox crossfade. */
  captureKey?: string | number
  /** Canvas path only: continuously re-capture (rAF) whenever the backdrop image
   *  moves — e.g. a lightbox photo being zoomed/panned — for realtime refraction.
   *  Redraws only on actual change, so it's idle-cheap. */
  live?: boolean
  /** For a control OUTSIDE a video hero that may sit over it (the fixed header
   *  menu button): self-manage a WebGL lens off the hero video on Safari/Firefox.
   *  It auto-detects when it's actually over the video (scroll/menu-occlusion
   *  aware), refracts + composites the wash there, and frosts otherwise. No-op on
   *  Chromium (backdrop-filter already refracts) and where there's no video. */
  standalone?: boolean
  /** Internal: suppress the tuner highlight ring (used by the tuner's preview). */
  tunerPreview?: boolean
  className?: string
}) {
  const tuner = useGlassTuner()
  const globalLight = useGlassLight()
  // Effective look: the live-tuned params for this preset while the tuner is open,
  // else the static preset — with any explicit prop override winning over both.
  const look = tuner ? tuner.params[preset] : GLASS_PRESETS[preset]
  const blurV = blur ?? look.blur
  const satV = saturate ?? look.saturate
  const scaleV = scale ?? look.scale
  const bezelV = bezel ?? look.bezel
  const curveV = curve ?? look.curve
  const thicknessV = thickness ?? look.thickness
  const dispersionV = dispersion ?? look.dispersion
  const edgeV = edge ?? look.edge
  const lightV = light ?? globalLight // single global light angle (overridable)
  const glowV = glow ?? look.glow
  const tintV = tint ?? look.tint
  const borderV = border ?? look.border
  const radiusV = radius ?? GLASS_PRESETS[preset].radius
  const refractV = tuner ? true : refract
  // While tuning, ring the surfaces that use the selected preset so it's obvious
  // which controls these sliders drive — but only flash it (tuner.showHighlight),
  // then fade out so it doesn't sit over the glass while you adjust the settings.
  const selectedHere = !!tuner && tuner.selected === preset && !tunerPreview

  // In a live-video hero on Safari/Firefox the hero's WebGL renderer draws the
  // refraction; this control just contributes the tint + specular and tags itself
  // so the renderer can find it. (Static-image heroes keep the canvas path below.)
  const lensMode = useInLensHero() && WEBGL_VIDEO && refractV
  // `standalone` control OUTSIDE such a hero (the fixed header button): it owns its
  // own WebGL lens off the hero video, drawn into its own canvas (below).
  const selfLens = standalone && WEBGL_VIDEO && refractV && !lensMode

  const ref = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selfCanvasRef = useRef<HTMLCanvasElement>(null)
  const selfRenderer = useRef<ReturnType<typeof createGlassRenderer>>(null)
  const id = "glass" + useId().replace(/[:]/g, "")
  const margin = SVG_BACKDROP ? 0 : Math.ceil(scaleV / 2) + 6
  const [map, setMap] = useState<{ url: string; w: number; h: number } | null>(
    null,
  )
  // Whether the canvas path actually found a backdrop to refract.
  const [canvasActive, setCanvasActive] = useState(false)
  // Standalone lens: whether it's currently over the live video (else it frosts).
  const [overVideo, setOverVideo] = useState(false)

  // Standalone WebGL lens: one renderer drawing this control's own canvas off the
  // hero video, reporting (onActive) whether it's over the video so the body can
  // go transparent there (and frost otherwise). Params follow the look live.
  useEffect(() => {
    if (!selfLens) return
    const host = ref.current
    const canvas = selfCanvasRef.current
    if (!host || !canvas) return
    const r = createGlassRenderer(
      canvas,
      host,
      {
        scale: scaleV / 2, // match feDisplacementMap's ±scale/2 throw
        bezel: bezelV,
        curve: curveV,
        thickness: thicknessV,
        dispersion: dispersionV,
        blur: blurV,
        saturate: satV,
      },
      { standalone: true, lenses: () => [host], onActive: setOverVideo },
    )
    selfRenderer.current = r
    return () => {
      selfRenderer.current = null
      setOverVideo(false)
      r?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfLens])
  useEffect(() => {
    selfRenderer.current?.setParams({
      scale: scaleV / 2,
      bezel: bezelV,
      curve: curveV,
      thickness: thicknessV,
      dispersion: dispersionV,
      blur: blurV,
      saturate: satV,
    })
  }, [scaleV, bezelV, curveV, thicknessV, dispersionV, blurV, satV])

  // Build the displacement map sized to the filtered element (the span on
  // Chromium, the larger canvas on the capture path).
  useEffect(() => {
    if (!refractV || lensMode || selfLens) {
      setMap(null)
      return
    }
    const el = ref.current
    if (!el) return
    const build = () => {
      const cw = Math.round(el.clientWidth)
      const ch = Math.round(el.clientHeight)
      if (cw < 4 || ch < 4) return
      const w = cw + margin * 2
      const h = ch + margin * 2
      const rad = radiusV >= 999 ? Math.min(cw, ch) / 2 : radiusV
      setMap({
        url: lensMap(
          w,
          h,
          rad,
          Math.min(bezelV, cw / 2, ch / 2),
          curveV,
          margin,
          thicknessV,
        ),
        w,
        h,
      })
    }
    build()
    const ro = new ResizeObserver(build)
    ro.observe(el)
    return () => ro.disconnect()
  }, [radiusV, bezelV, curveV, thicknessV, refractV, margin, lensMode, selfLens])

  // Capture path (Safari/Firefox): refract a copy of the backdrop on the canvas.
  // Only STATIC images — Safari won't re-run the filter as the canvas updates, so
  // a video backdrop would freeze on its first frame; live video is handled by the
  // hero's WebGL lens renderer instead (lensMode), and anything else over video
  // falls back to frosted here.
  useEffect(() => {
    if (SVG_BACKDROP || !refractV || lensMode || selfLens) {
      setCanvasActive(false)
      return
    }
    const host = ref.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    let cleanup: (() => void) | undefined
    const paint = (): DrawResult => {
      const media = findBackdrop(host)
      const img = media instanceof HTMLImageElement ? media : null
      // No image yet ⇒ "retry" (it may still mount), frosted meanwhile.
      const r: DrawResult = img ? drawBackdrop(canvas, host, img, margin) : "retry"
      setCanvasActive((a) => {
        const v = r === "drawn"
        return a === v ? a : v
      })
      return r
    }
    // Realtime mode: redraw every frame the backdrop image (or its transformed
    // rect) actually changes — e.g. a lightbox photo zooming/panning. Skips work
    // when nothing moved, so idle cost is just a rect read per frame.
    if (live) {
      let raf = 0
      let lastSig = ""
      const loop = () => {
        const media = findBackdrop(host)
        const img = media instanceof HTMLImageElement ? media : null
        if (img) {
          const mr = img.getBoundingClientRect()
          const hr = host.getBoundingClientRect()
          const sig = `${img.currentSrc}|${mr.left}|${mr.top}|${mr.width}|${mr.height}|${hr.left}|${hr.top}`
          if (sig !== lastSig) {
            const r = drawBackdrop(canvas, host, img, margin)
            if (r !== "retry") {
              // Record "drawn" AND "frost" — both are final for this rect. (Only
              // skipping this for "frost" was the bug: a frosted frame left lastSig
              // pointing at an old drawn rect, so panning back to it got skipped
              // and stayed frosted.)
              setCanvasActive((a) => {
                const v = r === "drawn"
                return a === v ? a : v
              })
              lastSig = sig
            }
          }
        } else if (lastSig !== "") {
          lastSig = ""
          setCanvasActive(false)
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      return () => cancelAnimationFrame(raf)
    }
    const start = () => {
      let settled = paint() !== "retry"
      const ro = new ResizeObserver(paint)
      ro.observe(host)
      window.addEventListener("resize", paint)
      // Keep re-capturing for a beat: covers a backdrop still decoding AND a
      // crossfade swapping the image in place (settle on the final frame). Stop
      // once we've a real result and the swap window (~600ms) has passed; give up
      // ~3.5s. ("retry" = not ready, keep polling.)
      let n = 0
      const poll = window.setInterval(() => {
        if (paint() !== "retry") settled = true
        if ((settled && n >= 4) || n > 24) clearInterval(poll)
        n++
      }, 150)
      cleanup = () => {
        ro.disconnect()
        window.removeEventListener("resize", paint)
        clearInterval(poll)
      }
    }
    // Give the hero a beat to mount its media (and decode), then start.
    const t = setTimeout(start, 60)
    return () => {
      clearTimeout(t)
      cleanup?.()
    }
  }, [refractV, margin, scaleV, lensMode, selfLens, captureKey, live])

  const base = `blur(${blurV}px) saturate(${satV})`
  const filterStr = map ? `${base} url(#${id})` : base
  const canvasMode = !SVG_BACKDROP && refractV && canvasActive
  // Transparent body = no backdrop-filter. lensMode controls get their refraction
  // from the hero's renderer. Standalone controls are ALWAYS transparent: backdrop-
  // filter is exactly what goes black over video on Safari (the load flash) and what
  // forces a hard frost↔lens switch mid-scroll, so we never use it — the lens canvas
  // (which fades in/out) supplies the refraction over the video, and over the flat
  // scrolled bar transparent + tint reads the same as a frost would.
  const transparent = lensMode || selfLens
  // Directional specular: the bright rim catches the light on the edge facing it
  // (lightV degrees, 0 = top, 90 = right). The lit highlight is an inset offset
  // toward that edge; a faint counter-highlight sits opposite.
  const lr = (lightV * Math.PI) / 180
  const ox = -Math.sin(lr)
  const oy = Math.cos(lr)
  const boxShadow =
    `inset ${(ox * 1.3).toFixed(2)}px ${(oy * 1.3).toFixed(2)}px 0.5px 0 rgba(255,255,255,${edgeV}),` +
    ` inset ${(-ox).toFixed(2)}px ${(-oy).toFixed(2)}px 2px 0 rgba(255,255,255,${(edgeV * 0.24).toFixed(3)}),` +
    ` 0 6px 18px -6px rgba(0,0,0,0.4)` +
    // Inset, not outer: the surface is always clipped (overflow-hidden), so an
    // outer halo would be cut off. This reads as a luminous inner rim instead.
    (glowV > 0
      ? `, inset 0 0 ${(glowV * 20).toFixed(1)}px rgba(255,255,255,${(glowV * 0.7).toFixed(3)})`
      : "")

  return (
    <>
    <span
      ref={ref}
      aria-hidden
      className={`glass-surface ${lensMode ? "glass-lens " : ""}${className}`}
      style={{
        ...FILL,
        overflow: "hidden",
        borderRadius: radiusV >= 999 ? 9999 : radiusV,
        backdropFilter: transparent
          ? undefined
          : canvasMode
            ? undefined
            : SVG_BACKDROP && map
              ? filterStr
              : base,
        WebkitBackdropFilter: transparent || canvasMode ? undefined : base,
      }}
    >
      {!SVG_BACKDROP && refractV && !lensMode && !selfLens && (
        <canvas
          ref={canvasRef}
          // Only apply the displacement filter once a backdrop was actually
          // captured. On an empty (transparent) canvas — e.g. a section-less
          // control that found nothing to refract — a url(#displacement) filter
          // renders as a black disc on Safari/Chromium; plain frost avoids it.
          style={{
            position: "absolute",
            filter: map && canvasActive ? filterStr : base,
          }}
        />
      )}
      {/* Standalone WebGL lens — refracted hero video for a control outside the
          hero. Fades in over the video and out as it leaves (the renderer freezes
          the last frame for the fade), revealing the transparent body underneath —
          a smooth crossfade to the bar, never a hard cut or a black flash. */}
      {selfLens && (
        <canvas
          ref={selfCanvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            transition: "opacity 300ms ease-out",
            opacity: overVideo ? 1 : 0,
          }}
        />
      )}
      {/* Tint fill + specular edge + glow, above the refracted backdrop. */}
      <span
        style={{
          ...FILL,
          borderRadius: radiusV >= 999 ? 9999 : radiusV,
          background: `rgba(255,255,255,${tintV})`,
          border: `1px solid rgba(255,255,255,${borderV})`,
          boxShadow,
        }}
      />
      {map && (
        <svg aria-hidden style={{ position: "absolute", height: 0, width: 0 }}>
          <filter
            id={id}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            x="0"
            y="0"
            width={map.w}
            height={map.h}
          >
            <feImage
              href={map.url}
              x="0"
              y="0"
              width={map.w}
              height={map.h}
              preserveAspectRatio="none"
              result="m"
            />
            {dispersionV > 0 ? (
              // Chromatic aberration: displace R/G/B by slightly different amounts
              // and recombine, so the rim refraction splits into coloured fringes.
              // The per-channel matrices keep ONE colour channel and PRESERVE the
              // source alpha (last row `0 0 0 1 0`). Forcing alpha to 1 instead made
              // the rim's out-of-bounds (transparent) samples composite to opaque
              // black — fine on the canvas path (opaque capture) but a solid black
              // disc on Chromium's backdrop-filter, where the rim oversamples past
              // the backdrop. Preserving alpha lets those samples stay transparent.
              <>
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="m"
                  scale={scaleV * (1 + dispersionV)}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="dr"
                />
                <feColorMatrix
                  in="dr"
                  type="matrix"
                  values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                  result="cr"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="m"
                  scale={scaleV}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="dg"
                />
                <feColorMatrix
                  in="dg"
                  type="matrix"
                  values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                  result="cg"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="m"
                  scale={scaleV * (1 - dispersionV)}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="db"
                />
                <feColorMatrix
                  in="db"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                  result="cb"
                />
                <feComposite
                  in="cr"
                  in2="cg"
                  operator="arithmetic"
                  k1="0"
                  k2="1"
                  k3="1"
                  k4="0"
                  result="crg"
                />
                <feComposite
                  in="crg"
                  in2="cb"
                  operator="arithmetic"
                  k1="0"
                  k2="1"
                  k3="1"
                  k4="0"
                />
              </>
            ) : (
              <feDisplacementMap
                in="SourceGraphic"
                in2="m"
                scale={scaleV}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            )}
          </filter>
        </svg>
      )}
    </span>
    {/* Hover/focus/active brightness reveal — folds in the old GlassReveal. In
        front of the glass (samples the rendered lens), so the consumer's icon,
        placed after <GlassSurface/>, stays on top. */}
    {reveal && <span aria-hidden className="glass-reveal" />}
    {/* Tuner highlight — rings the surfaces using the preset being edited, but
        only while flashed (fades out so it doesn't obscure the live effect). */}
    {selectedHere && (
      <span
        aria-hidden
        style={{
          ...FILL,
          transition: "opacity 500ms ease-out",
          opacity: tuner?.showHighlight ? 1 : 0,
          borderRadius: radiusV >= 999 ? 9999 : radiusV,
          boxShadow: "inset 0 0 0 2px #34d399",
          background: "rgba(52,211,153,0.14)",
        }}
      />
    )}
    </>
  )
}
