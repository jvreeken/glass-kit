import type { CSSProperties } from "react"
import { GlassLightProvider, GlassTunerProvider } from "glass-kit"
import "glass-kit/styles.css"
import { Header } from "./Header"
import { Hero } from "./Hero"

const FEATURES = [
  [
    "Refracts anything",
    "Drop <GlassSurface/> into any rounded, overflow-hidden control and it bends whatever sits behind — photos, gradients, UI, or live video.",
  ],
  [
    "Every browser",
    "Three render paths chosen automatically: backdrop-filter + SVG on Chromium, a captured canvas on Safari/Firefox over stills, and a WebGL lens over playing video everywhere.",
  ],
  [
    "Global light",
    "One specular light angle for the whole UI — drive it from device tilt, or fire a 360° shimmer sweep on load and on any tap.",
  ],
  [
    "Zero deps · MIT",
    "No Tailwind, no runtime deps beyond React. One small CSS file. Tune any look live with Shift+G and copy the JSON.",
  ],
]

export function App() {
  return (
    <GlassLightProvider>
      <GlassTunerProvider>
        <Header />
        <Hero />

        <section
          id="about"
          style={{
            background: "#eceef4",
            color: "#15151f",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "96px 24px 120px",
          }}
        >
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#6b6b86",
              }}
            >
              The glass above is the package
            </p>
            <h2
              style={{
                margin: "10px 0 0",
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              Liquid glass for React, in one component.
            </h2>
            <p
              style={{
                marginTop: 18,
                fontSize: 18,
                lineHeight: 1.6,
                color: "#3c3c4e",
                maxWidth: 640,
              }}
            >
              Everything on this page — the menu button refracting the video, the
              slideshow arrows, the pill, the scroll cue — is{" "}
              <code style={code}>glass-kit</code>. This demo is the README brought
              to life; its source lives in <code style={code}>examples/demo</code>.
            </p>

            <pre style={pre}>
              <code>npm i glass-kit</code>
            </pre>

            <div
              style={{
                marginTop: 48,
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              {FEATURES.map(([title, body]) => (
                <div
                  key={title}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: 22,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                    {title}
                  </h3>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 14.5,
                      lineHeight: 1.55,
                      color: "#4a4a5e",
                    }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 44, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="https://github.com/jvreeken/glass-kit" style={btnDark}>
                GitHub →
              </a>
              <a href="https://www.npmjs.com/package/glass-kit" style={btnLight}>
                npm
              </a>
              <span style={{ alignSelf: "center", color: "#6b6b86", fontSize: 14 }}>
                Press <kbd style={kbd}>Shift</kbd>+<kbd style={kbd}>G</kbd> to tune
                the glass.
              </span>
            </div>
          </div>
        </section>
      </GlassTunerProvider>
    </GlassLightProvider>
  )
}

const code: CSSProperties = {
  background: "rgba(0,0,0,0.06)",
  borderRadius: 5,
  padding: "1px 6px",
  fontSize: "0.9em",
}
const pre: CSSProperties = {
  marginTop: 22,
  background: "#15151f",
  color: "#e7e7f0",
  borderRadius: 12,
  padding: "16px 20px",
  fontSize: 15,
  overflowX: "auto",
}
const btnDark: CSSProperties = {
  background: "#15151f",
  color: "#fff",
  textDecoration: "none",
  padding: "12px 22px",
  borderRadius: 9999,
  fontWeight: 600,
  fontSize: 15,
}
const btnLight: CSSProperties = {
  background: "#fff",
  color: "#15151f",
  textDecoration: "none",
  padding: "12px 22px",
  borderRadius: 9999,
  fontWeight: 600,
  fontSize: 15,
  border: "1px solid rgba(0,0,0,0.12)",
}
const kbd: CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.15)",
  borderRadius: 5,
  padding: "1px 6px",
  fontSize: 12,
}
