"use client"

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  GlassTunerCtx,
  GlassTunerControlCtx,
  type GlassTunerState,
} from "./context"
import {
  GLASS_PRESETS,
  GLASS_PRESET_META,
  GLASS_PRESET_NAMES,
  DEFAULT_PRESET,
  type GlassParams,
  type GlassPresetName,
} from "./presets"
import { GlassSurface } from "./GlassSurface"
import { useGlassLightControl } from "./light"

// Real images (data-URI gradients) so the Safari/Firefox canvas path — which
// refracts a captured <img>, not a CSS background — has something to bend.
const grad = (id: string, a: string, b: string, c: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'>` +
      `<defs><linearGradient id='${id}' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${a}'/><stop offset='.55' stop-color='${b}'/>` +
      `<stop offset='1' stop-color='${c}'/></linearGradient></defs>` +
      `<rect width='160' height='120' fill='url(#${id})'/></svg>`,
  )
const GREEN_SVG = grad("g", "#7d9a72", "#3a5a40", "#1a2b1f")
const PHOTO_SVG = grad("p", "#c9c2b2", "#8a8276", "#46423a")

const FIELDS: {
  key: keyof GlassParams
  label: string
  min: number
  max: number
  step: number
}[] = [
  { key: "blur", label: "Blur", min: 0, max: 20, step: 0.5 },
  { key: "saturate", label: "Saturate", min: 1, max: 2.5, step: 0.05 },
  { key: "scale", label: "Refraction", min: 0, max: 60, step: 1 },
  { key: "bezel", label: "Edge band", min: 2, max: 30, step: 1 },
  { key: "curve", label: "Curvature", min: 1, max: 4, step: 0.1 },
  { key: "thickness", label: "Thickness", min: 0, max: 1, step: 0.02 },
  { key: "dispersion", label: "Dispersion", min: 0, max: 0.2, step: 0.005 },
  { key: "edge", label: "Edge highlight", min: 0, max: 1, step: 0.02 },
  { key: "glow", label: "Glow", min: 0, max: 0.5, step: 0.02 },
  { key: "tint", label: "Tint (frost)", min: 0, max: 0.3, step: 0.01 },
  { key: "border", label: "Border", min: 0, max: 0.6, step: 0.02 },
]

// Inline styles — the panel ships with the package and needs no utility CSS.
const cover: CSSProperties = {
  position: "absolute",
  inset: 0,
  height: "100%",
  width: "100%",
  objectFit: "cover",
}
const ghost: CSSProperties = {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  fontSize: 11,
  color: "rgba(255,255,255,0.55)",
}
const slider: CSSProperties = {
  flex: 1,
  height: 4,
  cursor: "pointer",
  accentColor: "#34d399",
}

/** Strip the structural radius → the tunable look params. */
function look({
  blur,
  saturate,
  scale,
  bezel,
  curve,
  thickness,
  dispersion,
  edge,
  glow,
  tint,
  border,
}: GlassParams & { radius?: number }): GlassParams {
  return {
    blur,
    saturate,
    scale,
    bezel,
    curve,
    thickness,
    dispersion,
    edge,
    glow,
    tint,
    border,
  }
}

function initParams(): Record<GlassPresetName, GlassParams> {
  const out = {} as Record<GlassPresetName, GlassParams>
  for (const name of GLASS_PRESET_NAMES) out[name] = look(GLASS_PRESETS[name])
  return out
}

/** Provides live, per-preset glass params to every GlassSurface. Toggle with
 *  Shift+G (or add ?glass to the URL). */
export function GlassTunerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [selected, setSelected] = useState<GlassPresetName>(DEFAULT_PRESET)
  const [params, setParams] =
    useState<Record<GlassPresetName, GlassParams>>(initParams)
  const [showHighlight, setShowHighlight] = useState(false)

  // Flash the on-page highlight for a moment when the tuner opens or you switch
  // preset — just long enough to point out the controls — then hide it so it
  // doesn't sit over the glass while you're dragging the sliders.
  useEffect(() => {
    if (!active) return
    setShowHighlight(true)
    const t = setTimeout(() => setShowHighlight(false), 1400)
    return () => clearTimeout(t)
  }, [active, selected])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("glass")) setActive(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "G" || e.key === "g")) {
        const t = e.target as HTMLElement | null
        if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
        e.preventDefault()
        setActive((a) => !a)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const value: GlassTunerState | null = active
    ? { params, selected, showHighlight }
    : null
  const control = useMemo(
    () => ({ open: active, setOpen: setActive }),
    [active],
  )

  return (
    <GlassTunerControlCtx.Provider value={control}>
      <GlassTunerCtx.Provider value={value}>
        {children}
        {active && (
          <Panel
            selected={selected}
            setSelected={setSelected}
            params={params}
            setParams={setParams}
            onClose={() => setActive(false)}
          />
        )}
      </GlassTunerCtx.Provider>
    </GlassTunerControlCtx.Provider>
  )
}

function Panel({
  selected,
  setSelected,
  params,
  setParams,
  onClose,
}: {
  selected: GlassPresetName
  setSelected: (p: GlassPresetName) => void
  params: Record<GlassPresetName, GlassParams>
  setParams: React.Dispatch<
    React.SetStateAction<Record<GlassPresetName, GlassParams>>
  >
  onClose: () => void
}) {
  const cur = params[selected]
  const meta = GLASS_PRESET_META[selected]
  const [copied, setCopied] = useState(false)
  const lightCtl = useGlassLightControl()

  const set = (key: keyof GlassParams, val: number) =>
    setParams((p) => ({ ...p, [selected]: { ...p[selected], [key]: val } }))
  const resetOne = () =>
    setParams((p) => ({ ...p, [selected]: look(GLASS_PRESETS[selected]) }))
  const copy = () => {
    const full = { ...cur, radius: GLASS_PRESETS[selected].radius }
    navigator.clipboard
      ?.writeText(JSON.stringify(full))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      })
      .catch(() => {})
  }

  const previewBox: CSSProperties = {
    position: "relative",
    display: "grid",
    height: 96,
    placeItems: "center",
    overflow: "hidden",
    borderRadius: 12,
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 2147483000,
        width: 320,
        maxWidth: "calc(100vw - 2rem)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(23,23,23,0.95)",
        padding: 16,
        color: "#fff",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 13,
      }}
    >
      {/* Preset picker — pick which kind of glass these sliders drive. */}
      <div
        style={{
          marginBottom: 8,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 4,
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          padding: 4,
        }}
      >
        {GLASS_PRESET_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSelected(name)}
            style={{
              border: 0,
              cursor: "pointer",
              borderRadius: 8,
              padding: "6px 8px",
              fontSize: 11,
              fontWeight: 500,
              background: selected === name ? "#34d399" : "transparent",
              color: selected === name ? "#171717" : "rgba(255,255,255,0.6)",
            }}
          >
            {GLASS_PRESET_META[name].label}
          </button>
        ))}
      </div>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 10,
          lineHeight: 1.4,
          color: "rgba(110,231,183,0.8)",
        }}
      >
        {meta.hint}
      </p>

      {/* Live preview — on a gradient + a "photo" so the canvas path (which
          refracts a real <img>) can be tuned too. tunerPreview hides the ring. */}
      <div
        style={{
          marginBottom: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <section style={previewBox}>
          <img src={GREEN_SVG} alt="" aria-hidden style={cover} />
          <div
            style={{
              position: "relative",
              display: "grid",
              width: 48,
              height: 48,
              placeItems: "center",
              overflow: "hidden",
              borderRadius: 9999,
            }}
          >
            <GlassSurface preset={selected} radius={999} tunerPreview />
            <span
              style={{
                position: "relative",
                width: 16,
                height: 16,
                borderRadius: 9999,
                background: "rgba(255,255,255,0.7)",
              }}
            />
          </div>
        </section>
        <section style={{ ...previewBox, background: "#404040" }}>
          <img src={PHOTO_SVG} alt="" aria-hidden style={cover} />
          <div
            style={{
              position: "relative",
              width: 64,
              height: 64,
              overflow: "hidden",
              borderRadius: 18,
            }}
          >
            <GlassSurface preset={selected} radius={18} tunerPreview />
          </div>
        </section>
      </div>

      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {meta.label} glass
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={resetOne} style={ghost}>
            reset
          </button>
          <button
            type="button"
            onClick={copy}
            style={{ ...ghost, fontWeight: 500, color: "#6ee7b7" }}
          >
            {copied ? "copied ✓" : "copy preset"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tuner"
            style={ghost}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FIELDS.map((f) => (
          <label
            key={f.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
            }}
          >
            <span
              style={{ width: 96, flexShrink: 0, color: "rgba(255,255,255,0.65)" }}
            >
              {f.label}
            </span>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={cur[f.key]}
              onChange={(e) => set(f.key, parseFloat(e.target.value))}
              style={slider}
            />
            <span
              style={{
                width: 36,
                flexShrink: 0,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {cur[f.key]}
            </span>
          </label>
        ))}
      </div>

      {/* Global light source — shared by every preset; device tilt overrides it. */}
      {lightCtl && (
        <div
          style={{
            marginTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 10,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
            }}
          >
            <span
              style={{ width: 96, flexShrink: 0, color: "rgba(255,255,255,0.65)" }}
            >
              Light angle
            </span>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={lightCtl.base}
              onChange={(e) => lightCtl.setBase(parseFloat(e.target.value))}
              style={slider}
            />
            <span
              style={{
                width: 36,
                flexShrink: 0,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {lightCtl.base}°
            </span>
          </label>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 10,
              color: "rgba(110,231,183,0.7)",
            }}
          >
            Global ·{" "}
            {lightCtl.sensorOn
              ? "following device tilt"
              : lightCtl.perm === "denied"
                ? "tilt permission denied"
                : lightCtl.perm === "unsupported"
                  ? "no motion sensor"
                  : "tap any glass button to enable device tilt"}
          </p>
        </div>
      )}

      <p
        style={{
          margin: "12px 0 0",
          fontSize: 10,
          lineHeight: 1.4,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        Shift+G toggles this. Pick a preset above — its controls glow on the page.
        Tweak, then hit “copy preset” to grab the JSON.
      </p>
    </div>
  )
}
