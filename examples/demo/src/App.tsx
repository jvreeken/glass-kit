import type { CSSProperties, ReactNode } from "react"
import {
  GlassSurface,
  ScrollCue,
  GlassLightProvider,
  GlassTunerProvider,
  type GlassPresetName,
} from "glass-kit"
import "glass-kit/styles.css"

const circle: CSSProperties = {
  position: "relative",
  display: "grid",
  placeItems: "center",
  width: 64,
  height: 64,
  overflow: "hidden",
  borderRadius: 9999,
  border: 0,
  background: "transparent",
  cursor: "pointer",
}

function GlassButton({
  preset,
  children,
}: {
  preset: GlassPresetName
  children: ReactNode
}) {
  return (
    <button className="glass-control" style={circle} aria-label={preset}>
      <GlassSurface preset={preset} reveal />
      <span
        className="glass-icon"
        style={{ position: "relative", color: "#fff", fontSize: 24 }}
      >
        {children}
      </span>
    </button>
  )
}

export function App() {
  return (
    <GlassLightProvider>
      <GlassTunerProvider>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            position: "relative",
            overflow: "hidden",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#fff",
            background:
              "radial-gradient(60rem 40rem at 18% 20%, #ff5e7e 0%, transparent 55%)," +
              "radial-gradient(50rem 50rem at 82% 18%, #3bc9db 0%, transparent 50%)," +
              "radial-gradient(50rem 40rem at 70% 92%, #ffd43b 0%, transparent 55%)," +
              "radial-gradient(60rem 50rem at 25% 95%, #845ef7 0%, transparent 55%)," +
              "linear-gradient(135deg, #10122a, #1d1340)",
          }}
        >
          {/* Big background type for the glass to refract over. */}
          <h1
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              margin: 0,
              fontSize: "clamp(4rem, 22vw, 18rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "rgba(255,255,255,0.10)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            glass-kit
          </h1>

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 40,
              padding: 24,
            }}
          >
            {/* A glass pane (plaque preset). */}
            <div
              className="glass-control"
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 20,
                padding: "26px 34px",
                textAlign: "center",
              }}
            >
              <GlassSurface preset="plaque" radius={20} reveal />
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    opacity: 0.8,
                  }}
                >
                  Liquid glass for React
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>
                  Refracts anything behind it
                </div>
              </div>
            </div>

            {/* Glass control buttons — one per preset. */}
            <div style={{ display: "flex", gap: 18 }}>
              <GlassButton preset="hero">✦</GlassButton>
              <GlassButton preset="portfolio">→</GlassButton>
              <GlassButton preset="plaque">◎</GlassButton>
            </div>

            <p style={{ opacity: 0.75, fontSize: 14, margin: 0 }}>
              Press <kbd>Shift</kbd>+<kbd>G</kbd> to open the tuner. Hover a
              control for the reveal.
            </p>
          </div>

          <ScrollCue
            onClick={() => {}}
            label="Scroll"
            preset="portfolio"
            className="glass-in"
          />
        </main>
      </GlassTunerProvider>
    </GlassLightProvider>
  )
}
