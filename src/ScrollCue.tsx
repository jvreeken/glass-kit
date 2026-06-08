"use client"

import { GlassSurface } from "./GlassSurface"
import type { GlassPresetName } from "./presets"

/** Bouncing scroll-down affordance for full-height heroes. Pass `targetId` to
 *  smooth-scroll to an element, or `onClick` for custom behavior. The whole glass
 *  button bounces (its transform also makes it the containing block for the glass),
 *  so put any outer positioning on the wrapper via `className`. */
export function ScrollCue({
  targetId,
  onClick,
  label = "Scroll down",
  refract = true,
  preset,
  className = "",
}: {
  targetId?: string
  onClick?: () => void
  label?: string
  refract?: boolean
  /** Glass look preset (defaults to "hero" via GlassSurface). */
  preset?: GlassPresetName
  className?: string
}) {
  const handle = () => {
    if (onClick) return onClick()
    if (targetId)
      document
        .getElementById(targetId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  return (
    <div className={className}>
      <button
        type="button"
        onClick={handle}
        aria-label={label}
        className="glass-control glass-bounce"
        style={{
          position: "relative",
          display: "grid",
          placeItems: "center",
          width: 44,
          height: 44,
          overflow: "hidden",
          borderRadius: 9999,
          border: 0,
          padding: 0,
          background: "transparent",
          cursor: "pointer",
        }}
      >
        {/* `live` so the refraction tracks the bounce (the button moves over the
            backdrop each frame) on the canvas path; `reveal` lifts on hover. */}
        <GlassSurface preset={preset} refract={refract} live reveal />
        <svg
          aria-hidden
          className="glass-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "relative",
            width: 20,
            height: 20,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  )
}
