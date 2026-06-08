// glass-lens-react — liquid-glass UI for React.
//
//   import { GlassSurface, ScrollCue, GlassLightProvider } from "glass-lens-react"
//   import "glass-lens-react/styles.css"   // once, anywhere in your app
//
//   <button className="gk-group" style={{ position: "relative", display: "grid",
//       placeItems: "center", width: 44, height: 44, overflow: "hidden",
//       borderRadius: 9999 }}>
//     <GlassSurface preset="portfolio" reveal />
//     <Icon className="gk-icon" style={{ position: "relative" }} />
//   </button>

export { GlassSurface } from "./GlassSurface"
export { ScrollCue } from "./ScrollCue"
export { GlassTunerProvider } from "./Tuner"
export {
  GlassLightProvider,
  useGlassLight,
  useGlassLightControl,
  DEFAULT_LIGHT,
  type GlassLightControl,
} from "./light"
export {
  GLASS_PRESETS,
  GLASS_PRESET_META,
  GLASS_PRESET_NAMES,
  DEFAULT_PRESET,
  type GlassParams,
  type GlassPreset,
  type GlassPresetName,
} from "./presets"

// Lower-level pieces, for driving a hero's own live-video WebGL lens.
export {
  GlassLensCtx,
  useInLensHero,
  useGlassTuner,
  useGlassTunerControl,
  type GlassTunerState,
  type GlassTunerControl,
} from "./context"
export { SVG_BACKDROP, WEBGL_VIDEO, FORCE_CANVAS, FORCE_WEBGL } from "./env"
export {
  createGlassRenderer,
  videoBackdrop,
  type GlassRendererParams,
} from "./webgl"
export { washAlpha } from "./wash"
