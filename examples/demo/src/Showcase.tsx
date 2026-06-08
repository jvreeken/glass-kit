import type { CSSProperties, ReactNode } from "react"
import { GlassSurface, type GlassPresetName } from "glass-lens-react"

/* ------------------------------------------------------------------ helpers */

function Section({
  id,
  bg = "#eef0f6",
  fg = "#15151f",
  children,
}: {
  id?: string
  bg?: string
  fg?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      style={{
        background: bg,
        color: fg,
        padding: "96px 24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>{children}</div>
    </section>
  )
}

const kickerStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#7b7b95",
}
const h2Style: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(1.9rem, 4.5vw, 2.9rem)",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.08,
}
const leadStyle: CSSProperties = {
  marginTop: 16,
  fontSize: 18,
  lineHeight: 1.6,
  color: "#43435a",
  maxWidth: 640,
}
const codeInline: CSSProperties = {
  background: "rgba(0,0,0,0.06)",
  borderRadius: 5,
  padding: "1px 6px",
  fontSize: "0.9em",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre
      style={{
        marginTop: 20,
        background: "#14141f",
        color: "#e7e7f2",
        borderRadius: 14,
        padding: "18px 22px",
        fontSize: 14,
        lineHeight: 1.7,
        overflowX: "auto",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <code>{children}</code>
    </pre>
  )
}

/** A glass control button over its own backdrop tile. */
function GlassChip({
  preset,
  radius = 9999,
  size = 66,
  children,
}: {
  preset: GlassPresetName
  radius?: number
  size?: number
  children?: ReactNode
}) {
  return (
    <div
      className="glass-control glass-in"
      style={{
        position: "relative",
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        overflow: "hidden",
        borderRadius: radius,
      }}
    >
      <GlassSurface preset={preset} radius={radius} reveal />
      <span
        className="glass-icon"
        style={{ position: "relative", color: "#fff", display: "grid" }}
      >
        {children}
      </span>
    </div>
  )
}

function Tile({
  bg,
  label,
  children,
}: {
  bg: string
  label: string
  children: ReactNode
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        placeItems: "center",
        aspectRatio: "1.35",
        borderRadius: 18,
        overflow: "hidden",
        background: bg,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {children}
      <span
        style={{
          position: "absolute",
          left: 12,
          bottom: 10,
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.82)",
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  )
}

const Dot = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </svg>
)
const Play = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
)
const Spark = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)
const Heart = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 21s-7-4.6-9.3-8.4C1 9.6 2.4 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.6 0 5 3.6 3.3 6.6C19 16.4 12 21 12 21z" />
  </svg>
)

/* ------------------------------------------------------------------ content */

const FEATURES = [
  [
    "Refracts anything",
    "Drop <GlassSurface/> into any rounded, overflow-hidden control and it bends whatever's behind — photos, gradients, UI, or live video.",
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

const PATHS = [
  [
    "Chromium",
    "backdrop-filter + an SVG displacement filter. Cheap, refracts any DOM behind it.",
  ],
  [
    "Safari / Firefox · stills",
    "A captured-backdrop <canvas> + filter:url(), object-fit aware, re-captured on change.",
  ],
  [
    "Any browser · live video",
    "A WebGL lens reads the playing <video> as a texture in a shader — backdrop-filter over video goes black, so this runs everywhere.",
  ],
]

const PROPS: [string, string, string][] = [
  ["preset", '"hero"', "named look — hero | portfolio | plaque"],
  ["reveal", "false", "hover/focus/active brightness lift (needs glass-control)"],
  ["refract", "true", "edge refraction on/off (off ⇒ frosted only)"],
  ["live", "false", "re-capture every frame the backdrop moves (canvas path)"],
  ["standalone", "false", "self-manage a video lens for a control outside the hero"],
  ["captureKey", "–", "change to re-capture on an in-place backdrop swap"],
  ["…look params", "from preset", "blur, scale, bezel, curve, thickness, dispersion, edge, glow, tint…"],
]

const PHOTO1 = "url(/videos/video-1.jpg)"
const PHOTO2 = "url(/videos/video-2.jpg)"
const PHOTO3 = "url(/videos/video-3.jpg)"
const WARM =
  "radial-gradient(60% 60% at 25% 25%, #ff7a8a 0%, transparent 60%), radial-gradient(60% 60% at 80% 30%, #ffd84d 0%, transparent 55%), linear-gradient(135deg, #f0568c, #7b3ff2)"
const COOL =
  "radial-gradient(60% 60% at 70% 25%, #3bd1d6 0%, transparent 55%), radial-gradient(50% 50% at 20% 80%, #7c5cff 0%, transparent 55%), linear-gradient(135deg, #0f1733, #123a5e)"
const STRIPES =
  "repeating-linear-gradient(45deg, #ff5e7e 0 18px, #ffb43b 18px 36px, #3bc9db 36px 54px, #845ef7 54px 72px)"

export function Showcase() {
  return (
    <>
      {/* Intro */}
      <Section id="about" bg="#f4f5f9">
        <p style={kickerStyle}>The glass above is the package</p>
        <h2 style={h2Style}>Liquid glass for React, in one component.</h2>
        <p style={leadStyle}>
          Everything on this page — the menu button refracting the video, the
          slideshow arrows, the pane, the scroll cue, and every tile below — is{" "}
          <code style={codeInline}>glass-lens-react</code>. This page is the README brought
          to life; its source lives in{" "}
          <code style={codeInline}>examples/demo</code>.
        </p>
        <Code>npm i glass-lens-react</Code>

        <div
          style={{
            marginTop: 44,
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
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
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
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
      </Section>

      {/* Examples gallery */}
      <Section bg="#11121d" fg="#fff">
        <p style={{ ...kickerStyle, color: "#8ea0ff" }}>Drop it on anything</p>
        <h2 style={h2Style}>It refracts whatever sits behind it</h2>
        <p style={{ ...leadStyle, color: "rgba(255,255,255,0.72)" }}>
          The same component over photos, gradients, patterns, and flat colour. On
          Chromium it bends the live DOM; over a solid it simply frosts.
        </p>
        <div
          style={{
            marginTop: 36,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <Tile bg={PHOTO1} label="Photo">
            <GlassChip preset="portfolio">
              <Play />
            </GlassChip>
          </Tile>
          <Tile bg={WARM} label="Gradient">
            <GlassChip preset="portfolio">
              <Heart />
            </GlassChip>
          </Tile>
          <Tile bg={STRIPES} label="Pattern">
            <GlassChip preset="portfolio">
              <Spark />
            </GlassChip>
          </Tile>
          <Tile bg={PHOTO2} label="Photo">
            <GlassChip preset="plaque" radius={18} size={92}>
              <Dot />
            </GlassChip>
          </Tile>
          <Tile bg={COOL} label="Gradient">
            <GlassChip preset="portfolio">
              <Dot />
            </GlassChip>
          </Tile>
          <Tile bg="#1d1d29" label="Flat colour">
            <GlassChip preset="portfolio">
              <Spark />
            </GlassChip>
          </Tile>
        </div>
      </Section>

      {/* Presets */}
      <Section bg="#f4f5f9">
        <p style={kickerStyle}>Three looks, one prop</p>
        <h2 style={h2Style}>
          Named presets — <code style={codeInline}>preset="…"</code>
        </h2>
        <p style={leadStyle}>
          <code style={codeInline}>hero</code> (crisp & dispersive, for video),{" "}
          <code style={codeInline}>portfolio</code> (subtle, for stills), and{" "}
          <code style={codeInline}>plaque</code> (a thick pane). Edit one in{" "}
          <code style={codeInline}>GLASS_PRESETS</code> and every surface using it
          updates — or tune live with <kbd style={kbd}>Shift</kbd>+
          <kbd style={kbd}>G</kbd>.
        </p>
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {(["hero", "portfolio", "plaque"] as GlassPresetName[]).map((p) => (
            <Tile key={p} bg={PHOTO1} label={p}>
              <GlassChip preset={p} radius={p === "plaque" ? 18 : 9999} size={92}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {p}
                </span>
              </GlassChip>
            </Tile>
          ))}
        </div>
      </Section>

      {/* Render paths */}
      <Section bg="#fff">
        <p style={kickerStyle}>Refracts everywhere</p>
        <h2 style={h2Style}>One API, three render paths</h2>
        <p style={leadStyle}>
          glass-lens-react picks the right technique per platform automatically — you just
          render <code style={codeInline}>&lt;GlassSurface/&gt;</code>.
        </p>
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {PATHS.map(([title, body], i) => (
            <div
              key={title}
              style={{
                border: "1px solid #e7e7ef",
                borderRadius: 16,
                padding: 22,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#7c5cff",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                0{i + 1}
              </div>
              <h3 style={{ margin: "8px 0 0", fontSize: 17, fontWeight: 700 }}>
                {title}
              </h3>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "#4a4a5e",
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Quick start + props */}
      <Section bg="#f4f5f9">
        <p style={kickerStyle}>Quick start</p>
        <h2 style={h2Style}>Drop it into a control</h2>
        <Code>{QUICKSTART}</Code>

        <h3 style={{ margin: "44px 0 0", fontSize: 20, fontWeight: 700 }}>
          &lt;GlassSurface&gt; props
        </h3>
        <div style={{ marginTop: 14, overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
              minWidth: 520,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "#7b7b95" }}>
                <th style={th}>prop</th>
                <th style={th}>default</th>
                <th style={th}>notes</th>
              </tr>
            </thead>
            <tbody>
              {PROPS.map(([p, d, n]) => (
                <tr key={p} style={{ borderTop: "1px solid #e3e3ee" }}>
                  <td style={{ ...td, fontFamily: "ui-monospace, monospace" }}>
                    {p}
                  </td>
                  <td style={{ ...td, color: "#7b7b95" }}>{d}</td>
                  <td style={td}>{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Light & shimmer */}
      <Section bg="#11121d" fg="#fff">
        <p style={{ ...kickerStyle, color: "#8ea0ff" }}>One global light source</p>
        <h2 style={h2Style}>Tilt to move it. Tap to shimmer.</h2>
        <p style={{ ...leadStyle, color: "rgba(255,255,255,0.72)" }}>
          Every rim's specular reads a single global angle. On a phone it follows
          your tilt (and self-calibrates a resting baseline). A 360° sweep fires on
          load and on any button press — tap one and watch the highlight whip around
          every rim at once.
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {(["portfolio", "portfolio", "plaque", "portfolio"] as GlassPresetName[]).map(
            (p, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  padding: 4,
                  background: i % 2 ? WARM : COOL,
                }}
              >
                <GlassChip preset={p} radius={p === "plaque" ? 16 : 9999} size={64}>
                  <Spark />
                </GlassChip>
              </div>
            ),
          )}
        </div>
      </Section>

      {/* Advanced / conventions */}
      <Section bg="#fff">
        <p style={kickerStyle}>Advanced</p>
        <h2 style={h2Style}>Live video & out-of-hero controls</h2>
        <p style={leadStyle}>
          For glass over playing video, a few opt-in DOM markers wire it up — all
          plain attributes you add to your own elements:
        </p>
        <ul
          style={{
            marginTop: 16,
            paddingLeft: 18,
            color: "#43435a",
            fontSize: 15.5,
            lineHeight: 1.7,
            maxWidth: 720,
          }}
        >
          <li>
            <code style={codeInline}>data-hero-active</code> on the element holding
            the live video — the lens samples it.
          </li>
          <li>
            <code style={codeInline}>&lt;GlassSurface standalone/&gt;</code> for a
            control <em>outside</em> that container (a fixed header button) — it
            auto-detects when it's over the video and frosts otherwise.
          </li>
          <li>
            <code style={codeInline}>data-glass-wash</code> on dark scrims so lenses
            darken to match; <code style={codeInline}>data-glass-occluder</code> on a
            full-screen overlay so a standalone lens lets go while it's up.
          </li>
        </ul>
      </Section>

      {/* Footer CTA */}
      <Section bg="#11121d" fg="#fff">
        <div style={{ textAlign: "center" }}>
          <h2 style={{ ...h2Style, fontSize: "clamp(2rem, 6vw, 3.4rem)" }}>
            glass-lens<span style={{ opacity: 0.5 }}>-react</span>
          </h2>
          <p
            style={{
              ...leadStyle,
              color: "rgba(255,255,255,0.72)",
              margin: "14px auto 0",
            }}
          >
            Liquid glass for React. Zero styling deps, MIT.
          </p>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a href="https://github.com/jvreeken/glass-lens-react" style={btnLight}>
              GitHub →
            </a>
            <a href="https://www.npmjs.com/package/glass-lens-react" style={btnGhost}>
              npm
            </a>
          </div>
          <p style={{ marginTop: 28, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
            Press <kbd style={kbdDark}>Shift</kbd>+<kbd style={kbdDark}>G</kbd> (or the
            Settings button up top) to tune any preset live.
          </p>
        </div>
      </Section>
    </>
  )
}

const QUICKSTART = `import { GlassSurface } from "glass-lens-react"
import "glass-lens-react/styles.css"

<button className="glass-control" style={{
  position: "relative", display: "grid", placeItems: "center",
  width: 44, height: 44, overflow: "hidden", borderRadius: 9999,
}}>
  <GlassSurface preset="portfolio" reveal />
  <Icon className="glass-icon" style={{ position: "relative" }} />
</button>`

const th: CSSProperties = {
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}
const td: CSSProperties = { padding: "10px 12px", verticalAlign: "top" }
const kbd: CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.15)",
  borderRadius: 5,
  padding: "1px 6px",
  fontSize: 12,
}
const kbdDark: CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 5,
  padding: "1px 6px",
  fontSize: 12,
}
const btnLight: CSSProperties = {
  background: "#fff",
  color: "#15151f",
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: 9999,
  fontWeight: 600,
  fontSize: 15,
}
const btnGhost: CSSProperties = {
  background: "transparent",
  color: "#fff",
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: 9999,
  fontWeight: 600,
  fontSize: 15,
  border: "1px solid rgba(255,255,255,0.3)",
}
