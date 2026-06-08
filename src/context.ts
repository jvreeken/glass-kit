"use client"

import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { GlassParams, GlassPresetName } from "./presets"

/** What the tuner shares while open: the live params for every preset (so each
 *  surface picks up its own preset's edits) and which preset is selected (so the
 *  matching surfaces can highlight themselves). null ⇒ tuner closed; surfaces use
 *  their static preset. */
export type GlassTunerState = {
  params: Record<GlassPresetName, GlassParams>
  selected: GlassPresetName
  /** Flashed true for a moment on open / preset switch so the matching surfaces
   *  reveal themselves, then false so the live effect isn't obscured while tuning. */
  showHighlight: boolean
}

export const GlassTunerCtx = createContext<GlassTunerState | null>(null)
export const useGlassTuner = () => useContext(GlassTunerCtx)

/** Open/close control for the tuner panel, so a UI button can open it (the
 *  Shift+G / ?glass toggle stays wired in GlassTunerProvider). null ⇒ no provider. */
export type GlassTunerControl = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}
export const GlassTunerControlCtx = createContext<GlassTunerControl | null>(null)
export const useGlassTunerControl = () => useContext(GlassTunerControlCtx)

// true ⇒ this GlassSurface lives inside a hero that owns a WebGL lens renderer
// (live-video backdrop on Safari/Firefox). The control then renders tint+specular
// only and tags itself `.glass-lens`; the hero's renderer draws the refraction.
export const GlassLensCtx = createContext(false)
export const useInLensHero = () => useContext(GlassLensCtx)
