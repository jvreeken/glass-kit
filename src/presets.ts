// The single source of truth for glass looks. Every glass control on the site
// references one of these named presets (`<GlassSurface preset="portfolio" />`)
// rather than spreading a bag of numbers, so a look can be tuned in one place and
// every surface using it updates. The ?glass tuner edits these live, per preset.

/** The tunable "look" parameters of a glass surface. */
export type GlassParams = {
  blur: number // backdrop blur, px
  saturate: number // backdrop saturate
  scale: number // refraction strength at the rim (feDisplacementMap), px
  bezel: number // width of the refracting edge band, px
  curve: number // edge ramp exponent (1 = linear, higher = sharper at the rim)
  thickness: number // convex lensing across the whole surface (0 = flat pane)
  dispersion: number // chromatic aberration — per-channel rim split (0 = none)
  edge: number // specular highlight opacity (direction is the global light angle)
  glow: number // inner rim glow opacity
  tint: number // frosted body fill (white) — keeps the glass from reading as a
  //              black void over dark backdrops / on Safari's canvas+WebGL paths
  border: number // rim border (white) opacity
}

/** A named preset: the look params plus the control's resting corner radius
 *  (999 ⇒ a pill/circle). Radius is structural, so it isn't a tuner slider. */
export type GlassPreset = GlassParams & { radius: number }

export type GlassPresetName = "hero" | "portfolio" | "plaque"

export const GLASS_PRESETS: Record<GlassPresetName, GlassPreset> = {
  // Crisp & refractive — for controls over moving video. No frost (blur/tint 0):
  // a clear, strongly dispersive lens with a bright specular rim.
  hero: {
    blur: 0,
    saturate: 1,
    scale: 47,
    bezel: 14,
    curve: 3.4,
    thickness: 0.36,
    dispersion: 0.125,
    edge: 1,
    glow: 0.18,
    tint: 0,
    border: 0,
    radius: 999,
  },
  // Subtler & frosted — for controls over still photos.
  portfolio: {
    blur: 0.5,
    saturate: 1.45,
    scale: 44,
    bezel: 11,
    curve: 2.8,
    thickness: 0.22,
    dispersion: 0.06,
    edge: 0.48,
    glow: 0.1,
    tint: 0.08,
    border: 0,
    radius: 999,
  },
  // A larger pane — titles, cards, panels; a thick convex dome with a soft rim.
  plaque: {
    blur: 0,
    saturate: 1,
    scale: 60,
    bezel: 25,
    curve: 3.3,
    thickness: 0.72,
    dispersion: 0.13,
    edge: 0.6,
    glow: 0.24,
    tint: 0.09,
    border: 0,
    radius: 16,
  },
}

export const DEFAULT_PRESET: GlassPresetName = "hero"

/** Tuner-facing metadata: a friendly name and where each preset is used, so the
 *  panel can show which kind of glass you're adjusting. */
export const GLASS_PRESET_META: Record<
  GlassPresetName,
  { label: string; hint: string }
> = {
  hero: {
    label: "Video",
    hint: "Crisp & refractive — controls over moving video",
  },
  portfolio: {
    label: "Photo",
    hint: "Subtler & frosted — controls over still photos",
  },
  plaque: {
    label: "Pane",
    hint: "A larger frosted pane — titles, cards, panels",
  },
}

export const GLASS_PRESET_NAMES = Object.keys(GLASS_PRESETS) as GlassPresetName[]
