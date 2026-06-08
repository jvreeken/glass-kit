// Which refraction path the glass uses, decided once from the platform.
//
// • Chromium → `backdrop-filter` + SVG filter (cheapest, refracts any DOM).
// • Safari/Firefox over a STATIC image → captured-backdrop <canvas> + filter:url().
// • Safari/Firefox over a LIVE video → WebGL: the hero reads the playing video as
//   a texture and draws each control's lens (Safari won't filter a live video, and
//   won't re-run a canvas filter per frame — so the canvas path freezes on frame 1).
//
// Force flags let the Safari paths be verified on desktop Chromium:
//   ?glasscanvas → canvas path everywhere   ?glasswebgl → WebGL video path
const CHROMIUM =
  typeof navigator !== "undefined" &&
  (navigator as Navigator & { userAgentData?: unknown }).userAgentData != null
const params =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null

export const FORCE_CANVAS = !!params?.has("glasscanvas")
export const FORCE_WEBGL = !!params?.has("glasswebgl")

/** Chromium's `backdrop-filter`+SVG path is available. */
export const SVG_BACKDROP = CHROMIUM && !FORCE_CANVAS && !FORCE_WEBGL

/** A live-video hero drives its controls with the WebGL lens renderer on ALL
 *  browsers — backdrop-filter over a PLAYING <video> is unreliable: black on
 *  Safari, and black on Chrome with the SVG displacement filter (it works over the
 *  poster, then drops to black once the clip decodes). So read the video as a GL
 *  texture instead. Chromium still uses SVG_BACKDROP for STATIC controls (only the
 *  in-hero / standalone-over-video surfaces switch to the lens). ?glasscanvas opts
 *  out to exercise the frozen canvas path. */
export const WEBGL_VIDEO = !FORCE_CANVAS
