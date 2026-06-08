// Readability "wash" math — shared by the canvas path (GlassSurface) and the
// WebGL standalone lens (webgl.ts), so a lens darkens to match the dark overlays
// the rest of the scene sits under instead of reading as a bright cut-out.

/** Alpha of a CSS color token (handles `oklab(0 0 0 / .8)`, `rgb(0 0 0 / .8)`,
 *  `rgba(0,0,0,.8)`, opaque colors → 1, transparent → 0). */
export function tokenAlpha(c: string): number {
  let m = c.match(/\/\s*([\d.]+)\s*\)/) // slash-alpha form (oklab/oklch/rgb)
  if (m) return parseFloat(m[1])
  m = c.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/)
  if (m) return parseFloat(m[1])
  if (/transparent|,\s*0\s*\)/.test(c)) return 0
  return /oklab|oklch|rgb|#|hsl/.test(c) ? 1 : 0
}

/** The black-overlay opacity of a readability "wash" element at screen point
 *  (x,y) — a solid translucent black, or a vertical black linear-gradient (the
 *  hero gradients). Used to darken the captured/refracted lens so it matches the
 *  washed surroundings instead of reading as a bright cut-out. */
export function washAlpha(el: HTMLElement, x: number, y: number): number {
  const cs = getComputedStyle(el)
  const grad = cs.backgroundImage
  if (grad.startsWith("linear-gradient")) {
    const r = el.getBoundingClientRect()
    if (r.height < 1) return 0
    const toBottom = grad.includes("to bottom")
    const f = Math.max(
      0,
      Math.min(1, toBottom ? (y - r.top) / r.height : (r.bottom - y) / r.height),
    )
    const body = grad.slice(grad.indexOf("(") + 1, grad.lastIndexOf(")"))
    const stops: { a: number; p: number | null }[] = []
    for (const t of body.split(/,(?![^(]*\))/).map((s) => s.trim())) {
      if (/^(to\s|[\d.]+(deg|turn|rad))/.test(t)) continue // direction token
      const pm = t.match(/([\d.]+)%\s*$/)
      stops.push({ a: tokenAlpha(t), p: pm ? parseFloat(pm[1]) / 100 : null })
    }
    if (!stops.length) return 0
    if (stops[0].p == null) stops[0].p = 0
    if (stops[stops.length - 1].p == null) stops[stops.length - 1].p = 1
    for (let i = 1; i < stops.length - 1; i++)
      if (stops[i].p == null) stops[i].p = i / (stops.length - 1)
    for (let i = 0; i < stops.length - 1; i++) {
      const p0 = stops[i].p as number
      const p1 = stops[i + 1].p as number
      if (f >= p0 && f <= p1) {
        const t = p1 > p0 ? (f - p0) / (p1 - p0) : 0
        return stops[i].a + (stops[i + 1].a - stops[i].a) * t
      }
    }
    return f <= (stops[0].p as number) ? stops[0].a : stops[stops.length - 1].a
  }
  return tokenAlpha(cs.backgroundColor)
}
